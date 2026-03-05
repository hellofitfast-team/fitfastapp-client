import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "./auth";
import { getCheckInFrequencyDays } from "./helpers";
import { DEFAULT_CHECK_IN_FREQUENCY_DAYS } from "./constants";
import { rateLimiter } from "./rateLimiter";
import { workflow } from "./workflowManager";

/** Shared InBody data validator — reused across check-in mutations and workflow */
export const inBodyDataValidator = v.object({
  bodyFatPercentage: v.optional(v.number()),
  leanBodyMass: v.optional(v.number()),
  skeletalMuscleMass: v.optional(v.number()),
  bmi: v.optional(v.number()),
  visceralFatLevel: v.optional(v.number()),
  basalMetabolicRate: v.optional(v.number()),
  totalBodyWater: v.optional(v.number()),
});

export const getMyCheckIns = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Capped at 100 most recent check-ins (bi-weekly = ~52 per year)
    return ctx.db
      .query("checkIns")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);
  },
});

export const getLatestCheckIn = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return ctx.db
      .query("checkIns")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
  },
});

export const getLockStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      return {
        isLocked: false,
        nextCheckInDate: null,
        frequencyDays: DEFAULT_CHECK_IN_FREQUENCY_DAYS,
      };

    const frequencyDays = await getCheckInFrequencyDays(ctx);

    const latestCheckIn = await ctx.db
      .query("checkIns")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    // Determine the anchor date: last check-in, or if none, the latest plan creation
    // This ensures new clients are locked after their initial plans are generated
    let anchorTime: number | null = latestCheckIn?._creationTime ?? null;

    if (!anchorTime) {
      // No check-ins yet — check if initial plans were generated (from assessment)
      const latestMealPlan = await ctx.db
        .query("mealPlans")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .first();
      const latestWorkoutPlan = await ctx.db
        .query("workoutPlans")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .first();

      // Use the earliest plan creation as anchor (both are generated together)
      const planTimes = [latestMealPlan?._creationTime, latestWorkoutPlan?._creationTime].filter(
        (t): t is number => t != null,
      );
      anchorTime = planTimes.length > 0 ? Math.min(...planTimes) : null;
    }

    if (!anchorTime) {
      // No plans yet — use assessment creation time (plans may still be generating async)
      const assessment = await ctx.db
        .query("initialAssessments")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();
      anchorTime = assessment?._creationTime ?? null;
    }

    if (!anchorTime) return { isLocked: false, nextCheckInDate: null, frequencyDays };

    const anchorDate = new Date(anchorTime);
    const nextCheckInDate = new Date(anchorDate);
    nextCheckInDate.setDate(nextCheckInDate.getDate() + frequencyDays);

    const isLocked = Date.now() < nextCheckInDate.getTime();

    return {
      isLocked,
      nextCheckInDate: nextCheckInDate.toISOString(),
      lastCheckInDate: anchorDate.toISOString(),
      frequencyDays,
    };
  },
});

/**
 * Legacy public mutation: just saves the check-in (no AI generation).
 * Rate-limited to 3 per day to prevent spam.
 * Kept for backward compatibility — prefer startCheckInWorkflow for new code.
 */
export const submitCheckIn = mutation({
  args: {
    weight: v.optional(v.number()),
    measurementMethod: v.optional(v.union(v.literal("manual"), v.literal("inbody"))),
    measurements: v.optional(
      v.object({
        chest: v.optional(v.number()),
        waist: v.optional(v.number()),
        hips: v.optional(v.number()),
        arms: v.optional(v.number()),
        thighs: v.optional(v.number()),
      }),
    ),
    inBodyStorageId: v.optional(v.id("_storage")),
    inBodyData: v.optional(inBodyDataValidator),
    workoutPerformance: v.optional(v.string()),
    energyLevel: v.optional(v.number()),
    sleepQuality: v.optional(v.number()),
    dietaryAdherence: v.optional(v.number()),
    newInjuries: v.optional(v.string()),
    progressPhotoIds: v.optional(v.array(v.id("_storage"))),
    progressPhotoFront: v.optional(v.id("_storage")),
    progressPhotoBack: v.optional(v.id("_storage")),
    progressPhotoSide: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { ok, retryAfter } = await rateLimiter.limit(ctx, "submitCheckIn", { key: userId });
    if (!ok) {
      throw new Error(`Too many check-ins — try again in ${Math.ceil((retryAfter ?? 0) / 1000)}s`);
    }

    return ctx.db.insert("checkIns", { userId, submittedAt: Date.now(), ...args });
  },
});

/**
 * New unified entry point: saves check-in + triggers AI plan generation
 * + sends notification — all as a durable, crash-safe workflow.
 *
 * Returns a workflowId that can be used to query progress.
 */
export const startCheckInWorkflow = mutation({
  args: {
    language: v.union(v.literal("en"), v.literal("ar")),
    planDuration: v.optional(v.number()),
    weight: v.optional(v.number()),
    measurementMethod: v.optional(v.union(v.literal("manual"), v.literal("inbody"))),
    measurements: v.optional(
      v.object({
        chest: v.optional(v.number()),
        waist: v.optional(v.number()),
        hips: v.optional(v.number()),
        arms: v.optional(v.number()),
        thighs: v.optional(v.number()),
      }),
    ),
    inBodyStorageId: v.optional(v.id("_storage")),
    inBodyData: v.optional(inBodyDataValidator),
    workoutPerformance: v.optional(v.string()),
    energyLevel: v.optional(v.number()),
    sleepQuality: v.optional(v.number()),
    dietaryAdherence: v.optional(v.number()),
    newInjuries: v.optional(v.string()),
    progressPhotoIds: v.optional(v.array(v.id("_storage"))),
    progressPhotoFront: v.optional(v.id("_storage")),
    progressPhotoBack: v.optional(v.id("_storage")),
    progressPhotoSide: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
  },
  returns: v.string(), // WorkflowId
  handler: async (ctx, { language, planDuration, ...checkInFields }): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Guard 1: max 3 check-in attempts per day (anti-spam)
    const checkInLimit = await rateLimiter.limit(ctx, "submitCheckIn", { key: userId });
    if (!checkInLimit.ok) {
      throw new Error(
        `Too many check-ins — try again in ${Math.ceil((checkInLimit.retryAfter ?? 0) / 1000)}s`,
      );
    }

    // Guard 2: max 2 AI plan generations per configured cycle (cost protection)
    const frequencyDays = await getCheckInFrequencyDays(ctx);
    const windowStart = Date.now() - frequencyDays * 24 * 60 * 60 * 1000;
    const recentMeals = await ctx.db
      .query("mealPlans")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gte(q.field("_creationTime"), windowStart))
      .collect();
    const recentWorkouts = await ctx.db
      .query("workoutPlans")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gte(q.field("_creationTime"), windowStart))
      .collect();
    if (Math.max(recentMeals.length, recentWorkouts.length) >= 2) {
      throw new Error("Plan generation limit reached for this cycle");
    }

    // Use configured frequency as default plan duration if not explicitly provided
    const resolvedPlanDuration = planDuration ?? frequencyDays;

    // Create check-in record synchronously so getLockStatus sees it immediately
    const checkInId = await ctx.db.insert("checkIns", {
      userId,
      submittedAt: Date.now(),
      ...checkInFields,
    });

    // Schedule InBody OCR if photo was uploaded
    if (checkInFields.inBodyStorageId && checkInFields.measurementMethod === "inbody") {
      await ctx.scheduler.runAfter(0, internal.ocrExtraction.extractInBodyData, {
        checkInId,
        storageId: checkInFields.inBodyStorageId,
      });
    }

    const workflowId = await workflow.start(ctx, internal.checkInWorkflow.checkInAndGeneratePlans, {
      userId,
      checkInId,
      language,
      planDuration: resolvedPlanDuration,
    });

    return workflowId;
  },
});

/** OCR status query — used by review step to reactively show InBody OCR results */
export const getCheckInOcrStatus = query({
  args: { checkInId: v.id("checkIns") },
  handler: async (ctx, { checkInId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const checkIn = await ctx.db.get(checkInId);
    if (!checkIn || checkIn.userId !== userId) return null;
    return { inBodyData: checkIn.inBodyData ?? null };
  },
});
