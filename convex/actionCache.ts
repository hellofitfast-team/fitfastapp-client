"use node";

import { ActionCache } from "@convex-dev/action-cache";
import { components, internal } from "./_generated/api";
import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Read-through caches for rarely-changing data.
 *
 * Both cache instances AND their public-facing action wrappers live here.
 * This prevents circular type inference: faqs.ts defines getFAQsUncached
 * and does NOT import from this file; actionCache.ts imports
 * internal.faqs.getFAQsUncached from _generated/api (a declared type, not
 * a live import from faqs.ts). The cycle is broken.
 */

const faqCache = new ActionCache(components.actionCache, {
  action: internal.faqs.getFAQsUncached,
  name: "faqs-v1",
  ttl: 60 * 60 * 1000, // 1 hour
});

const pricingCache = new ActionCache(components.actionCache, {
  action: internal.systemConfig.getPricingUncached,
  name: "pricing-v1",
  ttl: 30 * 60 * 1000, // 30 minutes
});

/**
 * Cached FAQ lookup — 1-hour TTL. Use on FAQ pages where real-time reactivity
 * isn't needed. Invalidated automatically on TTL expiry.
 */
export const getFAQsCached = action({
  args: { language: v.union(v.literal("en"), v.literal("ar")) },
  returns: v.any(),
  handler: async (ctx, { language }): Promise<unknown> => {
    return faqCache.fetch(ctx, { language });
  },
});

/**
 * Cached pricing lookup — 30-minute TTL. Use on landing/signup pages.
 */
export const getPricingCached = action({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<unknown> => {
    return pricingCache.fetch(ctx, {});
  },
});
