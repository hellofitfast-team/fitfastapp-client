import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { getAuthUserId } from "./auth";

/** Internal: used by notifications action to look up a user's push subscription */
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

/** Returns the VAPID public key so the client can subscribe to push */
export const getVapidPublicKey = query({
  args: {},
  handler: async (): Promise<string | null> => {
    return process.env.VAPID_PUBLIC_KEY ?? null;
  },
});

/** Internal: returns all active push subscriptions for non-coach clients */
export const getAllActiveSubscriptions = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Fetch subscriptions and profiles in parallel using indexes
    const [subscriptions, profiles] = await Promise.all([
      ctx.db
        .query("pushSubscriptions")
        .withIndex("by_isActive", (q) => q.eq("isActive", true))
        .collect(),
      ctx.db
        .query("profiles")
        .withIndex("by_isCoach", (q) => q.eq("isCoach", false))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect(),
    ]);

    const activeClientUserIds = new Set(profiles.map((p) => p.userId));
    return subscriptions.filter((sub) => activeClientUserIds.has(sub.userId));
  },
});

export const saveSubscription = mutation({
  args: {
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    deviceType: v.optional(v.string()),
  },
  handler: async (ctx, { endpoint, p256dh, auth, deviceType }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if subscription already exists for this endpoint
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        userId,
        p256dh,
        auth,
        isActive: true,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return ctx.db.insert("pushSubscriptions", {
      userId,
      endpoint,
      p256dh,
      auth,
      deviceType,
      isActive: true,
      updatedAt: Date.now(),
    });
  },
});

/** Internal: auto-deactivate an expired subscription (410 Gone from push service) */
export const deactivateByEndpoint = internalMutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();

    if (existing && existing.isActive) {
      await ctx.db.patch(existing._id, {
        isActive: false,
        updatedAt: Date.now(),
      });
    }
  },
});

export const deactivateSubscription = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();

    if (existing) {
      if (existing.userId !== userId) throw new Error("Not authorized");
      await ctx.db.patch(existing._id, {
        isActive: false,
        updatedAt: Date.now(),
      });
    }
  },
});
