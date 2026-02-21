import { query } from "./_generated/server";
import { getAuthUserId } from "./auth";
import { getCheckInFrequencyDays } from "./helpers";

export const getDashboardData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const today = new Date().toISOString().split("T")[0];

    // Fetch all dashboard data in parallel
    const [
      profile,
      assessment,
      latestCheckIn,
      mealPlans,
      workoutPlans,
      todayMealCompletions,
      todayWorkoutCompletions,
      todayReflection,
      tickets,
    ] = await Promise.all([
      ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique(),
      ctx.db
        .query("initialAssessments")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique(),
      ctx.db
        .query("checkIns")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .first(),
      ctx.db
        .query("mealPlans")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .take(1),
      ctx.db
        .query("workoutPlans")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .take(1),
      ctx.db
        .query("mealCompletions")
        .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", today))
        .collect(),
      ctx.db
        .query("workoutCompletions")
        .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", today))
        .collect(),
      ctx.db
        .query("dailyReflections")
        .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", today))
        .unique(),
      ctx.db
        .query("tickets")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .take(5),
    ]);

    const currentMealPlan = mealPlans[0] ?? null;
    const currentWorkoutPlan = workoutPlans[0] ?? null;

    // Calculate check-in lock status
    let checkInLock = { isLocked: false, nextCheckInDate: null as string | null };
    if (latestCheckIn) {
      const frequencyDays = await getCheckInFrequencyDays(ctx);
      const lastDate = new Date(latestCheckIn._creationTime);
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + frequencyDays);
      checkInLock = {
        isLocked: Date.now() < nextDate.getTime(),
        nextCheckInDate: nextDate.toISOString(),
      };
    }

    return {
      profile,
      assessment,
      latestCheckIn,
      currentMealPlan,
      currentWorkoutPlan,
      todayMealCompletions,
      todayWorkoutCompletions,
      todayReflection,
      recentTickets: tickets,
      checkInLock,
    };
  },
});
