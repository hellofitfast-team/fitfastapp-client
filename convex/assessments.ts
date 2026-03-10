import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "./auth";
import { rateLimiter } from "./rateLimiter";
import { inBodyDataValidator } from "./checkIns";

export const getMyAssessment = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return ctx.db
      .query("initialAssessments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const getAssessmentByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const callerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", callerId))
      .unique();
    if (!callerProfile?.isCoach) throw new Error("Not authorized");

    return ctx.db
      .query("initialAssessments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const submitAssessment = mutation({
  args: {
    goals: v.optional(v.string()),
    currentWeight: v.optional(v.number()),
    height: v.optional(v.number()),
    age: v.optional(v.number()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    measurements: v.optional(
      v.object({
        chest: v.optional(v.number()),
        waist: v.optional(v.number()),
        hips: v.optional(v.number()),
        arms: v.optional(v.number()),
        thighs: v.optional(v.number()),
      }),
    ),
    scheduleAvailability: v.optional(
      v.object({
        days: v.optional(v.array(v.string())),
        sessionDuration: v.optional(v.number()),
        preferredTime: v.optional(v.string()),
      }),
    ),
    foodPreferences: v.optional(v.array(v.string())),
    allergies: v.optional(v.array(v.string())),
    dietaryRestrictions: v.optional(v.array(v.string())),
    medicalConditions: v.optional(v.array(v.string())),
    injuries: v.optional(v.array(v.string())),
    exerciseHistory: v.optional(v.string()),
    activityLevel: v.optional(
      v.union(
        v.literal("sedentary"),
        v.literal("lightly_active"),
        v.literal("moderately_active"),
        v.literal("very_active"),
      ),
    ),
    experienceLevel: v.optional(
      v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    ),
    lifestyleHabits: v.optional(
      v.object({
        equipment: v.optional(v.string()),
        mealsPerDay: v.optional(v.number()),
      }),
    ),
    measurementMethod: v.optional(v.union(v.literal("manual"), v.literal("inbody"))),
    inBodyStorageId: v.optional(v.id("_storage")),
    // Optional: trigger server-side plan generation after assessment
    generatePlans: v.optional(
      v.object({
        language: v.union(v.literal("en"), v.literal("ar")),
        planDuration: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Rate limit: 5 assessment submissions per day per user
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "submitAssessment", { key: userId });
    if (!ok) {
      throw new Error(
        `Too many submissions — try again in ${Math.ceil((retryAfter ?? 0) / 1000)}s`,
      );
    }

    const { generatePlans, ...assessmentData } = args;

    // Guard: prevent generatePlans=true if user already has plans (initial generation only)
    if (generatePlans) {
      const existingMealPlan = await ctx.db
        .query("mealPlans")
        .withIndex("by_userId", (q: any) => q.eq("userId", userId))
        .first();
      const existingWorkoutPlan = await ctx.db
        .query("workoutPlans")
        .withIndex("by_userId", (q: any) => q.eq("userId", userId))
        .first();
      if (existingMealPlan || existingWorkoutPlan) {
        throw new Error("Plans already exist — use check-in to generate updated plans");
      }
    }

    // Check if assessment already exists
    const existing = await ctx.db
      .query("initialAssessments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    let assessmentId;

    if (existing) {
      // Snapshot the old assessment for AI progressive context
      const changedFields: string[] = [];
      for (const [key, value] of Object.entries(assessmentData)) {
        const oldValue = (existing as Record<string, unknown>)[key];
        if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
          changedFields.push(key);
        }
      }

      if (changedFields.length > 0) {
        // Count existing history entries for version number
        const historyEntries = await ctx.db
          .query("assessmentHistory")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .collect();

        await ctx.db.insert("assessmentHistory", {
          userId,
          assessmentSnapshot: { ...existing },
          changedFields,
          versionNumber: historyEntries.length + 1,
          createdAt: Date.now(),
        });
      }

      await ctx.db.patch(existing._id, assessmentData);
      assessmentId = existing._id;
    } else {
      assessmentId = await ctx.db.insert("initialAssessments", {
        userId,
        ...assessmentData,
      });
    }

    // Schedule InBody OCR extraction if uploaded
    if (assessmentData.measurementMethod === "inbody" && assessmentData.inBodyStorageId) {
      await ctx.scheduler.runAfter(0, internal.ocrExtraction.extractAssessmentInBodyData, {
        assessmentId,
        storageId: assessmentData.inBodyStorageId,
      });
    }

    // Schedule server-side plan generation (survives client navigation)
    if (generatePlans) {
      await ctx.scheduler.runAfter(0, internal.ai.generateMealPlanInternal, {
        userId,
        language: generatePlans.language,
        planDuration: generatePlans.planDuration,
      });
      await ctx.scheduler.runAfter(0, internal.ai.generateWorkoutPlanInternal, {
        userId,
        language: generatePlans.language,
        planDuration: generatePlans.planDuration,
      });
    }

    return assessmentId;
  },
});

/** Patch InBody OCR results onto an assessment record (called by extractAssessmentInBodyData). */
export const patchAssessmentInBodyData = internalMutation({
  args: {
    assessmentId: v.id("initialAssessments"),
    inBodyData: inBodyDataValidator,
  },
  handler: async (ctx, { assessmentId, inBodyData }): Promise<void> => {
    const existing = await ctx.db.get(assessmentId);
    if (!existing) {
      console.warn("[patchAssessmentInBodyData] Assessment not found", { assessmentId });
      return;
    }
    await ctx.db.patch(assessmentId, { inBodyData });
  },
});
