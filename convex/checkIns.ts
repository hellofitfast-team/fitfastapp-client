import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "./auth";
import { getCheckInFrequencyDays } from "./helpers";
import { rateLimiter } from "./rateLimiter";
import { workflow } from "./workflowManager";

export const getMyCheckIns = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return ctx.db
      .query("checkIns")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
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
    if (!userId) return { isLocked: false, nextCheckInDate: null };

    const latest = await ctx.db
      .query("checkIns")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    if (!latest) return { isLocked: false, nextCheckInDate: null };

    const frequencyDays = await getCheckInFrequencyDays(ctx);
    const lastCheckInDate = new Date(latest._creationTime);
    const nextCheckInDate = new Date(lastCheckInDate);
    nextCheckInDate.setDate(nextCheckInDate.getDate() + frequencyDays);

    const isLocked = Date.now() < nextCheckInDate.getTime();

    return {
      isLocked,
      nextCheckInDate: nextCheckInDate.toISOString(),
      lastCheckInDate: lastCheckInDate.toISOString(),
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
    measurements: v.optional(v.any()),
    workoutPerformance: v.optional(v.string()),
    energyLevel: v.optional(v.number()),
    sleepQuality: v.optional(v.number()),
    dietaryAdherence: v.optional(v.number()),
    newInjuries: v.optional(v.string()),
    progressPhotoIds: v.optional(v.array(v.id("_storage"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { ok, retryAfter } = await rateLimiter.limit(ctx, "submitCheckIn", { key: userId });
    if (!ok) {
      throw new Error(`Too many check-ins — try again in ${Math.ceil((retryAfter ?? 0) / 1000)}s`);
    }

    return ctx.db.insert("checkIns", { userId, ...args });
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
    measurements: v.optional(v.any()),
    workoutPerformance: v.optional(v.string()),
    energyLevel: v.optional(v.number()),
    sleepQuality: v.optional(v.number()),
    dietaryAdherence: v.optional(v.number()),
    newInjuries: v.optional(v.string()),
    progressPhotoIds: v.optional(v.array(v.id("_storage"))),
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
    if (recentMeals.length + recentWorkouts.length >= 2) {
      throw new Error("Plan generation limit reached for this cycle");
    }

    // Use configured frequency as default plan duration if not explicitly provided
    const resolvedPlanDuration = planDuration ?? frequencyDays;

    return workflow.start(ctx, internal.checkInWorkflow.checkInAndGeneratePlans, {
      userId,
      language,
      planDuration: resolvedPlanDuration,
      ...checkInFields,
    });
  },
});
