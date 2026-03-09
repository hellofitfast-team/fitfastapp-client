import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "./auth";

export const getCurrentPlan = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const today = new Date().toISOString().split("T")[0];

    // Use compound index to find plans where startDate <= today
    // Ordered desc by startDate so the first match with endDate >= today is the current plan
    // Only need recent candidates — capped to avoid loading all historical plans
    const candidatePlans = await ctx.db
      .query("workoutPlans")
      .withIndex("by_userId_dates", (q) => q.eq("userId", userId).lte("startDate", today))
      .order("desc")
      .take(5);

    const activePlan = candidatePlans.find((p) => p.endDate >= today);
    if (activePlan) return activePlan;

    // Fallback: most recent plan (regardless of date range)
    return await ctx.db
      .query("workoutPlans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
  },
});

export const getMyPlans = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return ctx.db
      .query("workoutPlans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getPlansByUserId = query({
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
      .query("workoutPlans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Internal: look up a plan by checkInId (used by workflow after workpool finishes)
export const getIdByCheckIn = internalQuery({
  args: { userId: v.string(), checkInId: v.id("checkIns") },
  handler: async (ctx, { userId, checkInId }) => {
    const plans = await ctx.db
      .query("workoutPlans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(5);
    return plans.find((p) => p.checkInId === checkInId)?._id ?? null;
  },
});

export const savePlanInternal = internalMutation({
  args: {
    userId: v.string(),
    checkInId: v.optional(v.id("checkIns")),
    planData: v.any(),
    aiGeneratedContent: v.optional(v.string()),
    streamId: v.optional(v.string()),
    language: v.union(v.literal("en"), v.literal("ar")),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("workoutPlans", args);
  },
});

export const updatePlanData = internalMutation({
  args: {
    planId: v.id("workoutPlans"),
    planData: v.any(),
    aiGeneratedContent: v.optional(v.string()),
  },
  handler: async (ctx, { planId, planData, aiGeneratedContent }) => {
    await ctx.db.patch(planId, { planData, aiGeneratedContent });
  },
});

export const saveTranslation = internalMutation({
  args: {
    planId: v.id("workoutPlans"),
    translatedPlanData: v.any(),
    translatedLanguage: v.union(v.literal("en"), v.literal("ar")),
  },
  handler: async (ctx, { planId, translatedPlanData, translatedLanguage }) => {
    await ctx.db.patch(planId, { translatedPlanData, translatedLanguage });
  },
});

export const requestTranslation = action({
  args: {
    targetLanguage: v.union(v.literal("en"), v.literal("ar")),
  },
  handler: async (ctx, { targetLanguage }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const plan = await ctx.runQuery(internal.workoutPlans.getCurrentPlanInternal, { userId });
    if (!plan) throw new Error("No workout plan found");

    if (plan.language === targetLanguage) return;
    if (plan.translatedLanguage === targetLanguage && plan.translatedPlanData) return;

    await ctx.scheduler.runAfter(0, internal.ai.translatePlanContent, {
      planId: plan._id,
      planType: "workout",
      planData: plan.planData,
      sourceLanguage: plan.language,
      targetLanguage,
    });
  },
});

export const getCurrentPlanInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const today = new Date().toISOString().split("T")[0];
    const candidatePlans = await ctx.db
      .query("workoutPlans")
      .withIndex("by_userId_dates", (q) => q.eq("userId", userId).lte("startDate", today))
      .order("desc")
      .take(5);

    const activePlan = candidatePlans.find((p) => p.endDate >= today);
    if (activePlan) return activePlan;

    return await ctx.db
      .query("workoutPlans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
  },
});

// ---------------------------------------------------------------------------
// Exercise swap — queries exercise DB for alternatives
// ---------------------------------------------------------------------------

export const swapExercise = mutation({
  args: {
    planId: v.id("workoutPlans"),
    dayKey: v.string(),
    exerciseIndex: v.number(),
  },
  handler: async (ctx, { planId, dayKey, exerciseIndex }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const plan = await ctx.db.get(planId);
    if (!plan || plan.userId !== userId) throw new Error("Plan not found");

    const planData = plan.planData as Record<string, any>;
    const weeklyPlan = planData?.weeklyPlan;
    if (!weeklyPlan?.[dayKey]) throw new Error("Day not found");

    const dayPlan = weeklyPlan[dayKey];
    if (dayPlan.restDay) throw new Error("Cannot swap exercises on a rest day");

    const exercises = dayPlan.exercises;
    if (!Array.isArray(exercises) || exerciseIndex < 0 || exerciseIndex >= exercises.length) {
      throw new Error("Invalid exercise index");
    }

    const currentExercise = exercises[exerciseIndex];
    const currentName = currentExercise.name?.toLowerCase() ?? "";
    const targetMuscles: string[] = currentExercise.targetMuscles ?? [];

    // Get all exercises already in this day to avoid duplicates
    const usedNames = new Set(exercises.map((e: any) => (e.name ?? "").toLowerCase()));

    // Query exercise database for alternatives with matching muscles
    const allExercises = await ctx.db.query("exerciseDatabase").collect();
    const activeExercises = allExercises.filter((e) => e.isActive);

    // Score alternatives by muscle match
    const targetSet = new Set(targetMuscles.map((m) => m.toLowerCase()));
    const candidates = activeExercises
      .filter((e) => {
        // Must not be the current exercise or already in today's workout
        if (e.name.toLowerCase() === currentName) return false;
        if (usedNames.has(e.name.toLowerCase())) return false;
        // Must not be warmup/cooldown
        if (e.category === "warmup" || e.category === "cooldown") return false;
        return true;
      })
      .map((e) => {
        let score = 0;
        for (const m of e.primaryMuscles) {
          if (targetSet.has(m.toLowerCase())) score += 5;
        }
        for (const m of e.secondaryMuscles) {
          if (targetSet.has(m.toLowerCase())) score += 1;
        }
        if (e.category === "compound") score += 3;
        return { exercise: e, score };
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score);

    if (candidates.length === 0) throw new Error("No alternative exercises available");

    // Pick the best match
    const best = candidates[0]!.exercise;
    const lang = plan.language;
    const newExercise = {
      name: lang === "ar" && best.nameAr ? best.nameAr : best.name,
      sets: currentExercise.sets ?? best.defaultSets,
      reps:
        best.defaultRepsMin === best.defaultRepsMax
          ? `${best.defaultRepsMin}`
          : `${best.defaultRepsMin}-${best.defaultRepsMax}`,
      restBetweenSets: `${best.defaultRestSeconds}s`,
      targetMuscles: best.primaryMuscles,
      instructions: [lang === "ar" && best.instructionsAr ? best.instructionsAr : best.instructions]
        .flatMap((s) =>
          s
            .split(/\n|(?<=\.)\s+/)
            .map((p) => p.trim())
            .filter(Boolean),
        )
        .slice(0, 2),
    };

    // Replace in planData
    exercises[exerciseIndex] = newExercise;
    await ctx.db.patch(planId, { planData });

    // Also swap in translatedPlanData if it exists
    if (plan.translatedPlanData) {
      try {
        const translated = plan.translatedPlanData as Record<string, any>;
        const translatedDay = translated?.weeklyPlan?.[dayKey];
        if (translatedDay?.exercises?.[exerciseIndex]) {
          const altLang = plan.language === "en" ? "ar" : "en";
          translatedDay.exercises[exerciseIndex] = {
            ...newExercise,
            name: altLang === "ar" && best.nameAr ? best.nameAr : best.name,
            instructions: [
              altLang === "ar" && best.instructionsAr ? best.instructionsAr : best.instructions,
            ]
              .flatMap((s) =>
                s
                  .split(/\n|(?<=\.)\s+/)
                  .map((p) => p.trim())
                  .filter(Boolean),
              )
              .slice(0, 2),
          };
          await ctx.db.patch(planId, { translatedPlanData: translated });
        }
      } catch {
        // Ignore translation swap errors — primary swap succeeded
      }
    }
  },
});
