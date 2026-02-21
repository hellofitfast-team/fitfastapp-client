import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "./auth";

export const getMealCompletions = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return ctx.db
      .query("mealCompletions")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", date))
      .collect();
  },
});

export const getWorkoutCompletions = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return ctx.db
      .query("workoutCompletions")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", date))
      .collect();
  },
});

export const getTrackingData = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { mealCompletions: [], workoutCompletions: [], reflection: null };

    const [mealCompletions, workoutCompletions, reflection] = await Promise.all([
      ctx.db
        .query("mealCompletions")
        .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", date))
        .collect(),
      ctx.db
        .query("workoutCompletions")
        .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", date))
        .collect(),
      ctx.db
        .query("dailyReflections")
        .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", date))
        .unique(),
    ]);

    return { mealCompletions, workoutCompletions, reflection };
  },
});

export const toggleMealCompletion = mutation({
  args: {
    mealPlanId: v.id("mealPlans"),
    date: v.string(),
    mealIndex: v.number(),
    completed: v.boolean(),
  },
  handler: async (ctx, { mealPlanId, date, mealIndex, completed }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Find existing completion
    const existing = await ctx.db
      .query("mealCompletions")
      .withIndex("by_planId_date", (q) => q.eq("mealPlanId", mealPlanId).eq("date", date))
      .collect();

    const match = existing.find((c) => c.mealIndex === mealIndex);

    if (match) {
      await ctx.db.patch(match._id, { completed });
    } else {
      await ctx.db.insert("mealCompletions", {
        userId,
        mealPlanId,
        date,
        mealIndex,
        completed,
      });
    }
  },
});

export const toggleWorkoutCompletion = mutation({
  args: {
    workoutPlanId: v.id("workoutPlans"),
    date: v.string(),
    workoutIndex: v.number(),
    completed: v.boolean(),
  },
  handler: async (ctx, { workoutPlanId, date, workoutIndex, completed }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("workoutCompletions")
      .withIndex("by_planId_date", (q) => q.eq("workoutPlanId", workoutPlanId).eq("date", date))
      .collect();

    const match = existing.find((c) => c.workoutIndex === workoutIndex);

    if (match) {
      await ctx.db.patch(match._id, { completed });
    } else {
      await ctx.db.insert("workoutCompletions", {
        userId,
        workoutPlanId,
        date,
        workoutIndex,
        completed,
      });
    }
  },
});
