import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "./auth";

// Internal: used by notifications action to look up a user's push endpoint
export const getSubscriptionByUserId = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

export const getMySubscription = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

export const saveSubscription = mutation({
  args: {
    onesignalSubscriptionId: v.string(),
    deviceType: v.optional(v.string()),
  },
  handler: async (ctx, { onesignalSubscriptionId, deviceType }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if subscription already exists
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_subscriptionId", (q) =>
        q.eq("onesignalSubscriptionId", onesignalSubscriptionId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        userId,
        isActive: true,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return ctx.db.insert("pushSubscriptions", {
      userId,
      onesignalSubscriptionId,
      deviceType,
      isActive: true,
      updatedAt: Date.now(),
    });
  },
});

export const deactivateSubscription = mutation({
  args: { onesignalSubscriptionId: v.string() },
  handler: async (ctx, { onesignalSubscriptionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_subscriptionId", (q) =>
        q.eq("onesignalSubscriptionId", onesignalSubscriptionId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isActive: false,
        updatedAt: Date.now(),
      });
    }
  },
});
