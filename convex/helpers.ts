import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { getAuthUserId } from "./auth";
import { DEFAULT_CHECK_IN_FREQUENCY_DAYS, DEFAULT_WORKOUT_PLAN_DURATION_DAYS } from "./constants";

/**
 * Fetch the coach-configured check-in frequency from systemConfig.
 * Falls back to DEFAULT_CHECK_IN_FREQUENCY_DAYS if not configured.
 * Works in any context with direct DB access (queries, mutations).
 */
export async function getCheckInFrequencyDays(ctx: { db: any }): Promise<number> {
  const config = await ctx.db
    .query("systemConfig")
    .withIndex("by_key", (q: any) => q.eq("key", "check_in_frequency_days"))
    .unique();
  const raw = config?.value;
  if (raw == null) return DEFAULT_CHECK_IN_FREQUENCY_DAYS;
  const num = typeof raw === "number" ? raw : Number(raw);
  // 0 means "no lock" (useful for testing); NaN or negative falls back to default
  return num >= 0 && !isNaN(num) ? num : DEFAULT_CHECK_IN_FREQUENCY_DAYS;
}

/**
 * Require the current user to be an authenticated coach.
 * Throws if not authenticated or not a coach.
 * Works in queries, mutations, and any context with direct DB access.
 */
export async function requireCoach(ctx: { db: any; auth: any }): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .unique();
  if (!profile?.isCoach) throw new Error("Not authorized");
  return userId;
}

// Internal queries used by AI actions to fetch data
export const getProfileInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const getAssessmentInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("initialAssessments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const getCheckInInternal = internalQuery({
  args: { checkInId: v.id("checkIns") },
  handler: async (ctx, { checkInId }) => {
    return ctx.db.get(checkInId);
  },
});

/**
 * Meal plan duration always equals check-in frequency
 * (plans regenerate every check-in, so a separate config is redundant).
 */
export async function getMealPlanDurationDays(ctx: { db: any }): Promise<number> {
  return getCheckInFrequencyDays(ctx);
}

/**
 * Fetch the coach-configured workout plan duration from systemConfig.
 * Fallback chain: workout_plan_duration_days → check_in_frequency_days → DEFAULT_WORKOUT_PLAN_DURATION_DAYS
 */
export async function getWorkoutPlanDurationDays(ctx: { db: any }): Promise<number> {
  const config = await ctx.db
    .query("systemConfig")
    .withIndex("by_key", (q: any) => q.eq("key", "workout_plan_duration_days"))
    .unique();
  const raw = config?.value;
  if (raw != null) {
    const num = typeof raw === "number" ? raw : Number(raw);
    if (!isNaN(num) && num >= 1) return num;
  }
  const freq = await getCheckInFrequencyDays(ctx);
  return freq > 0 ? freq : DEFAULT_WORKOUT_PLAN_DURATION_DAYS;
}

/** Internal query wrapper for getMealPlanDurationDays — used by actions */
export const getMealPlanDurationInternal = internalQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx): Promise<number> => {
    return getMealPlanDurationDays(ctx);
  },
});

/** Internal query wrapper for getWorkoutPlanDurationDays — used by actions */
export const getWorkoutPlanDurationInternal = internalQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx): Promise<number> => {
    return getWorkoutPlanDurationDays(ctx);
  },
});

/**
 * Internal query wrapper for getCheckInFrequencyDays — used by actions
 * (which can't access ctx.db directly and must use ctx.runQuery).
 */
export const getCheckInFrequencyInternal = internalQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx): Promise<number> => {
    return getCheckInFrequencyDays(ctx);
  },
});

export const getTicketInternal = internalQuery({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    return ctx.db.get(ticketId);
  },
});

/**
 * Count recent plan generation pairs (meal + workout = 1 pair) for a user since a given timestamp.
 * Used for dynamic plan-generation rate limiting.
 * Returns the MAX of meal plans or workout plans (not the sum),
 * since each check-in generates one of each — counting the sum would
 * exhaust the limit after a single generation cycle.
 */
export const countRecentPlans = internalQuery({
  args: { userId: v.string(), since: v.number() },
  returns: v.number(),
  handler: async (ctx, { userId, since }): Promise<number> => {
    const meals = await ctx.db
      .query("mealPlans")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gte(q.field("_creationTime"), since))
      .collect();
    const workouts = await ctx.db
      .query("workoutPlans")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gte(q.field("_creationTime"), since))
      .collect();
    // Each generation cycle produces one meal + one workout plan.
    // Use the max count so the limit represents generation cycles, not individual plans.
    return Math.max(meals.length, workouts.length);
  },
});
