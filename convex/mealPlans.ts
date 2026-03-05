import { v } from "convex/values";
import { query, action, internalMutation, internalQuery } from "./_generated/server";
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
