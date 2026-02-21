import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "./auth";

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
    measurements: v.optional(v.any()),
    scheduleAvailability: v.optional(v.any()),
    foodPreferences: v.optional(v.array(v.string())),
    allergies: v.optional(v.array(v.string())),
    dietaryRestrictions: v.optional(v.array(v.string())),
    medicalConditions: v.optional(v.array(v.string())),
    injuries: v.optional(v.array(v.string())),
    exerciseHistory: v.optional(v.string()),
    experienceLevel: v.optional(
      v.union(
        v.literal("beginner"),
        v.literal("intermediate"),
        v.literal("advanced"),
      ),
    ),
    lifestyleHabits: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if assessment already exists
    const existing = await ctx.db
      .query("initialAssessments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return ctx.db.insert("initialAssessments", {
      userId,
      ...args,
    });
  },
});
