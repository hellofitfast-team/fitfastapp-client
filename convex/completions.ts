import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "./auth";
import { rateLimiter } from "./rateLimiter";

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

export const getStreak = query({
  args: {
    /** Client's local date as YYYY-MM-DD so streaks align with user's midnight */
    clientToday: v.optional(v.string()),
  },
  handler: async (ctx, { clientToday }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { currentStreak: 0, lastActiveDate: "" };

    // Get recent completions (both meal + workout), ordered by date desc
    const recentMealCompletions = await ctx.db
      .query("mealCompletions")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId))
      .order("desc")
      .take(365);

    const recentWorkoutCompletions = await ctx.db
      .query("workoutCompletions")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId))
      .order("desc")
      .take(365);

    // Collect unique dates with at least one completion
    const activeDates = new Set<string>();
    for (const c of recentMealCompletions) {
      if (c.completed) activeDates.add(c.date);
    }
    for (const c of recentWorkoutCompletions) {
      if (c.completed) activeDates.add(c.date);
    }

    if (activeDates.size === 0) return { currentStreak: 0, lastActiveDate: "" };

    // Sort dates descending
    const sortedDates = [...activeDates].sort().reverse();

    // Use client's local date when provided, otherwise fall back to UTC.
    // This ensures streaks align with the user's midnight, not the server's.
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const todayStr =
      clientToday && dateRegex.test(clientToday)
        ? clientToday
        : new Date().toISOString().split("T")[0];

    // Compute yesterday by decrementing the date string
    const todayDate = new Date(todayStr + "T00:00:00Z");
    todayDate.setUTCDate(todayDate.getUTCDate() - 1);
    const yesterdayStr = todayDate.toISOString().split("T")[0];

    if (!activeDates.has(todayStr) && !activeDates.has(yesterdayStr)) {
      return { currentStreak: 0, lastActiveDate: sortedDates[0] };
    }

    // Walk backwards from today (or yesterday) counting consecutive active days
    const cursor = new Date(todayStr + "T00:00:00Z");
    if (!activeDates.has(todayStr)) {
      // Start from yesterday if today isn't active
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    let streak = 0;

    while (true) {
      const dateStr = cursor.toISOString().split("T")[0];
      if (!activeDates.has(dateStr)) break;
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    return { currentStreak: streak, lastActiveDate: sortedDates[0] };
  },
});

export const getAdherenceStats = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Validate date format and range
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) return null;
    if (startDate > endDate) return null;

    const LIMIT = 1001;
    const [mealCompletions, workoutCompletions] = await Promise.all([
      ctx.db
        .query("mealCompletions")
        .withIndex("by_userId_date", (q) =>
          q.eq("userId", userId).gte("date", startDate).lte("date", endDate),
        )
        .take(LIMIT),
      ctx.db
        .query("workoutCompletions")
        .withIndex("by_userId_date", (q) =>
          q.eq("userId", userId).gte("date", startDate).lte("date", endDate),
        )
        .take(LIMIT),
    ]);

    const mealsTruncated = mealCompletions.length === LIMIT;
    const workoutsTruncated = workoutCompletions.length === LIMIT;
    const meals = mealsTruncated ? mealCompletions.slice(0, LIMIT - 1) : mealCompletions;
    const workouts = workoutsTruncated
      ? workoutCompletions.slice(0, LIMIT - 1)
      : workoutCompletions;

    const completedMeals = meals.filter((c) => c.completed).length;
    const completedWorkouts = workouts.filter((c) => c.completed).length;

    return {
      mealAdherence: meals.length > 0 ? (completedMeals / meals.length) * 100 : 0,
      workoutAdherence: workouts.length > 0 ? (completedWorkouts / workouts.length) * 100 : 0,
      totalMeals: meals.length,
      completedMeals,
      totalWorkouts: workouts.length,
      completedWorkouts,
      truncated: mealsTruncated || workoutsTruncated,
    };
  },
});

export const toggleMealCompletion = mutation({
  args: {
    mealPlanId: v.id("mealPlans"),
    date: v.string(),
    mealIndex: v.number(),
    completed: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { mealPlanId, date, mealIndex, completed, notes }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Rate limit
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "toggleCompletion", { key: userId });
    if (!ok) {
      throw new Error(`Too many requests — try again in ${Math.ceil((retryAfter ?? 0) / 1000)}s`);
    }

    // Input validation
    if (notes && notes.length > 500) throw new Error("Notes too long (max 500 characters)");

    // Verify plan ownership
    const plan = await ctx.db.get(mealPlanId);
    if (!plan || plan.userId !== userId) throw new Error("Not authorized");

    // O(1) lookup via 3-way composite index
    const match = await ctx.db
      .query("mealCompletions")
      .withIndex("by_planId_date_mealIndex", (q) =>
        q.eq("mealPlanId", mealPlanId).eq("date", date).eq("mealIndex", mealIndex),
      )
      .unique();

    if (match) {
      await ctx.db.patch(match._id, { completed, notes });
    } else {
      await ctx.db.insert("mealCompletions", {
        userId,
        mealPlanId,
        date,
        mealIndex,
        completed,
        notes,
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
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { workoutPlanId, date, workoutIndex, completed, notes }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Rate limit
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "toggleCompletion", { key: userId });
    if (!ok) {
      throw new Error(`Too many requests — try again in ${Math.ceil((retryAfter ?? 0) / 1000)}s`);
    }

    // Input validation
    if (notes && notes.length > 500) throw new Error("Notes too long (max 500 characters)");

    // Verify plan ownership
    const plan = await ctx.db.get(workoutPlanId);
    if (!plan || plan.userId !== userId) throw new Error("Not authorized");

    // O(1) lookup via 3-way composite index
    const match = await ctx.db
      .query("workoutCompletions")
      .withIndex("by_planId_date_workoutIndex", (q) =>
        q.eq("workoutPlanId", workoutPlanId).eq("date", date).eq("workoutIndex", workoutIndex),
      )
      .unique();

    if (match) {
      await ctx.db.patch(match._id, { completed, notes });
    } else {
      await ctx.db.insert("workoutCompletions", {
        userId,
        workoutPlanId,
        date,
        workoutIndex,
        completed,
        notes,
      });
    }
  },
});
