import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "./auth";

export const getCurrentPlan = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const today = new Date().toISOString().split("T")[0];

    // Find plan where today is between startDate and endDate
    const plans = await ctx.db
      .query("mealPlans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return plans.find((p) => p.startDate <= today && p.endDate >= today) ?? plans[0] ?? null;
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

// Internal: called from AI action after plan generation
export const savePlanInternal = internalMutation({
  args: {
    userId: v.string(),
    checkInId: v.optional(v.id("checkIns")),
    planData: v.any(),
    aiGeneratedContent: v.optional(v.string()),
    streamId: v.optional(v.string()),
    language: v.string(),
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
