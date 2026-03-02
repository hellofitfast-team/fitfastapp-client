import { v } from "convex/values";
import { query, mutation, internalQuery, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "./auth";

const PUBLIC_CONFIG_KEYS = new Set([
  "pricing",
  "plans",
  "paymentMethods",
  "social_links",
  "check_in_frequency_days",
]);

export const getConfig = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    if (!PUBLIC_CONFIG_KEYS.has(key)) {
      const userId = await getAuthUserId(ctx);
      if (!userId) throw new Error("Not authenticated");
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique();
      if (!profile?.isCoach) throw new Error("Not authorized");
    }
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

/** Internal query for server-to-server use (no auth) — used by actions that need config */
export const getConfigInternal = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    return ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
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
    return (
      (record?.value as Array<{
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
      }>) ?? []
    );
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
    return (
      (record?.value as Array<{
        type: string;
        accountName: string;
        accountNumber: string;
        instructions?: string;
      }>) ?? []
    );
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

// Keys whose values must always be stored as numbers
const NUMERIC_CONFIG_KEYS = new Set(["check_in_frequency_days"]);

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

    // Coerce string-typed numbers for keys that must be numeric
    const storedValue =
      NUMERIC_CONFIG_KEYS.has(key) && typeof value === "string"
        ? value.trim() === "" || Number.isNaN(Number(value))
          ? 14
          : Number(value)
        : value;

    const existing = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { value: storedValue, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("systemConfig", {
        key,
        value: storedValue,
        updatedAt: Date.now(),
      });
    }
  },
});

// ── Social Links ──────────────────────────────────────────────────────────────

export const getSocialLinks = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "social_links"))
      .unique();
    return (row?.value ?? {}) as Record<string, string>;
  },
});

export const updateSocialLinks = mutation({
  args: {
    links: v.object({
      twitter: v.optional(v.string()),
      instagram: v.optional(v.string()),
      tiktok: v.optional(v.string()),
      youtube: v.optional(v.string()),
      facebook: v.optional(v.string()),
      linkedin: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { links }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.isCoach) throw new Error("Not authorized");

    // Strip empty strings
    const cleaned: Record<string, string> = {};
    for (const [key, val] of Object.entries(links)) {
      if (val && val.trim()) cleaned[key] = val.trim();
    }

    const existing = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "social_links"))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { value: cleaned, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("systemConfig", {
        key: "social_links",
        value: cleaned,
        updatedAt: Date.now(),
      });
    }
  },
});
