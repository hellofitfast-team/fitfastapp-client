import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "./auth";

export const getReflection = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return ctx.db
      .query("dailyReflections")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", date))
      .unique();
  },
});

export const saveReflection = mutation({
  args: {
    date: v.string(),
    reflection: v.string(),
  },
  handler: async (ctx, { date, reflection }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("dailyReflections")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", date))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { reflection });
      return existing._id;
    }

    return ctx.db.insert("dailyReflections", {
      userId,
      date,
      reflection,
    });
  },
});
