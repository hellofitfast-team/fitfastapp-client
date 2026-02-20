import { v } from "convex/values";
import { query, mutation, internalQuery, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "./auth";

export const getConfig = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    return ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
  },
});

export const getPricing = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "pricing"))
      .unique();
  },
});

// Internal query for server-to-server use (no auth) — used by the cache action
export const getPricingInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "pricing"))
      .unique();
  },
});

// Internal action called by ActionCache on a miss — do NOT import pricingCache here
// (that would create a circular type-inference cycle through _generated/api)
export const getPricingUncached = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<unknown> => {
    return ctx.runQuery(internal.systemConfig.getPricingInternal);
  },
});

// ---------------------------------------------------------------------------
// Plans — coach-configurable pricing plans (read by marketing app, no auth)
// ---------------------------------------------------------------------------

export const getPlans = query({
  args: {},
  handler: async (ctx) => {
    const record = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "plans"))
      .unique();
    return (record?.value as Array<{
      id: string;
      name: string;
      nameAr: string;
      price: number;
      currency: string;
      duration: string;
      durationAr: string;
      features: string[];
      featuresAr: string[];
      badge?: string;
      badgeAr?: string;
    }>) ?? [];
  },
});

export const updatePlans = mutation({
  args: {
    plans: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        nameAr: v.string(),
        price: v.number(),
        currency: v.string(),
        duration: v.string(),
        durationAr: v.string(),
        features: v.array(v.string()),
        featuresAr: v.array(v.string()),
        badge: v.optional(v.string()),
        badgeAr: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { plans }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.isCoach) throw new Error("Not authorized");

    const existing = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "plans"))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { value: plans, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("systemConfig", {
        key: "plans",
        value: plans,
        updatedAt: Date.now(),
      });
    }
  },
});

// ---------------------------------------------------------------------------
// Payment methods — coach-configurable (InstaPay, Vodafone Cash, etc.)
// Read by marketing app checkout form (no auth required)
// ---------------------------------------------------------------------------

export const getPaymentMethods = query({
  args: {},
  handler: async (ctx) => {
    const record = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "paymentMethods"))
      .unique();
    return (record?.value as Array<{
      type: string;
      accountName: string;
      accountNumber: string;
      instructions?: string;
    }>) ?? [];
  },
});

export const updatePaymentMethods = mutation({
  args: {
    paymentMethods: v.array(
      v.object({
        type: v.string(),
        accountName: v.string(),
        accountNumber: v.string(),
        instructions: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { paymentMethods }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.isCoach) throw new Error("Not authorized");

    const existing = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "paymentMethods"))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { value: paymentMethods, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("systemConfig", {
        key: "paymentMethods",
        value: paymentMethods,
        updatedAt: Date.now(),
      });
    }
  },
});

export const setConfig = mutation({
  args: {
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, { key, value }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.isCoach) throw new Error("Not authorized");

    const existing = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("systemConfig", {
        key,
        value,
        updatedAt: Date.now(),
      });
    }
  },
});
