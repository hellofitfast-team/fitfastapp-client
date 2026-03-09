import { v } from "convex/values";
import { query, action, mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "./auth";
import type { MealPlanData, Meal, MealAlternative, Macros } from "./planTypes";

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
      .query("mealPlans")
      .withIndex("by_userId_dates", (q) => q.eq("userId", userId).lte("startDate", today))
      .order("desc")
      .take(5);

    const activePlan = candidatePlans.find((p) => p.endDate >= today);
    if (activePlan) return activePlan;

    // Fallback: most recent plan (regardless of date range)
    return await ctx.db
      .query("mealPlans")
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
      .query("mealPlans")
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
      .query("mealPlans")
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
      .query("mealPlans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(5);
    return plans.find((p) => p.checkInId === checkInId)?._id ?? null;
  },
});

// Internal: called from AI action after plan generation
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
    return ctx.db.insert("mealPlans", args);
  },
});

export const updatePlanData = internalMutation({
  args: {
    planId: v.id("mealPlans"),
    planData: v.any(),
    aiGeneratedContent: v.optional(v.string()),
  },
  handler: async (ctx, { planId, planData, aiGeneratedContent }) => {
    await ctx.db.patch(planId, { planData, aiGeneratedContent });
  },
});

export const saveTranslation = internalMutation({
  args: {
    planId: v.id("mealPlans"),
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

    const plan = await ctx.runQuery(internal.mealPlans.getCurrentPlanInternal, { userId });
    if (!plan) throw new Error("No meal plan found");

    if (plan.language === targetLanguage) return;
    if (plan.translatedLanguage === targetLanguage && plan.translatedPlanData) return;

    await ctx.scheduler.runAfter(0, internal.ai.translatePlanContent, {
      planId: plan._id,
      planType: "meal",
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
      .query("mealPlans")
      .withIndex("by_userId_dates", (q) => q.eq("userId", userId).lte("startDate", today))
      .order("desc")
      .take(5);

    const activePlan = candidatePlans.find((p) => p.endDate >= today);
    if (activePlan) return activePlan;

    return await ctx.db
      .query("mealPlans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
  },
});

/** Recalculate daily totals from meal macros */
function recalcDailyTotals(
  meals: Array<{ calories: number; protein: number; carbs: number; fat: number }>,
): Macros {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein: acc.protein + (m.protein || 0),
      carbs: acc.carbs + (m.carbs || 0),
      fat: acc.fat + (m.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/** Perform swap on a planData object: exchange meal ↔ alternative */
function performSwap(
  planData: MealPlanData,
  dayKey: string,
  mealIndex: number,
  alternativeIndex: number,
): MealPlanData {
  const day = planData.weeklyPlan[dayKey];
  if (!day) throw new Error(`Day "${dayKey}" not found in plan`);
  if (!day.meals[mealIndex]) throw new Error(`Meal index ${mealIndex} out of bounds`);

  const meal = day.meals[mealIndex] as Meal;
  if (!meal.alternatives?.[alternativeIndex]) {
    throw new Error(`Alternative index ${alternativeIndex} out of bounds`);
  }

  const alt = meal.alternatives[alternativeIndex] as MealAlternative;

  // Build the new meal from the alternative, carrying over the old meal as an alternative
  const oldMealAsAlt: MealAlternative = {
    name: meal.name,
    type: meal.type,
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
    ingredients: meal.ingredients,
    instructions: meal.instructions,
  };

  const newAlternatives = [...meal.alternatives];
  newAlternatives[alternativeIndex] = oldMealAsAlt;

  const newMeal: Meal = {
    name: alt.name,
    type: alt.type,
    calories: alt.calories,
    protein: alt.protein,
    carbs: alt.carbs,
    fat: alt.fat,
    ingredients: alt.ingredients,
    instructions: alt.instructions,
    alternatives: newAlternatives,
  };

  const newMeals = [...day.meals];
  newMeals[mealIndex] = newMeal;

  const newDailyTotals = recalcDailyTotals(newMeals);

  return {
    ...planData,
    weeklyPlan: {
      ...planData.weeklyPlan,
      [dayKey]: { ...day, meals: newMeals, dailyTotals: newDailyTotals },
    },
  };
}

export const swapMeal = mutation({
  args: {
    planId: v.id("mealPlans"),
    dayKey: v.string(),
    mealIndex: v.number(),
    alternativeIndex: v.number(),
  },
  handler: async (ctx, { planId, dayKey, mealIndex, alternativeIndex }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const plan = await ctx.db.get(planId);
    if (!plan) throw new Error("Meal plan not found");
    if (plan.userId !== userId) throw new Error("Not authorized");

    const planData = plan.planData as MealPlanData;
    if (!planData?.weeklyPlan) throw new Error("Invalid plan data");

    // Perform swap on primary planData
    const updatedPlanData = performSwap(planData, dayKey, mealIndex, alternativeIndex);

    // Mirror swap on translatedPlanData if it exists
    const patch: Record<string, unknown> = { planData: updatedPlanData };
    if (plan.translatedPlanData) {
      try {
        const translatedData = plan.translatedPlanData as MealPlanData;
        patch.translatedPlanData = performSwap(translatedData, dayKey, mealIndex, alternativeIndex);
      } catch {
        // Translation may have different structure; skip mirroring
      }
    }

    await ctx.db.patch(planId, patch);
  },
});
