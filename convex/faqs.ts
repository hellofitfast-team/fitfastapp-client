import { v } from "convex/values";
import { query, mutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "./auth";

// Real-time query — use in FAQ editor where reactive updates matter
export const getFAQs = query({
  args: { language: v.union(v.literal("en"), v.literal("ar")) },
  handler: async (ctx, { language }) => {
    return ctx.db
      .query("faqs")
      .withIndex("by_language_order", (q) => q.eq("language", language))
      .collect();
  },
});

// Internal query — used by getFAQsUncached action; bypasses auth for server-to-server use
export const getFAQsInternal = internalQuery({
  args: { language: v.union(v.literal("en"), v.literal("ar")) },
  handler: async (ctx, { language }) => {
    return ctx.db
      .query("faqs")
      .withIndex("by_language_order", (q) => q.eq("language", language))
      .collect();
  },
});

// Internal action called by ActionCache on a cache miss — do NOT import faqCache here
// (that would create a circular type-inference cycle through _generated/api)
export const getFAQsUncached = internalAction({
  args: { language: v.union(v.literal("en"), v.literal("ar")) },
  returns: v.array(v.any()),
  handler: async (ctx, { language }): Promise<unknown[]> => {
    return ctx.runQuery(internal.faqs.getFAQsInternal, { language });
  },
});

export const createFAQ = mutation({
  args: {
    question: v.string(),
    answer: v.string(),
    language: v.union(v.literal("en"), v.literal("ar")),
    displayOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.isCoach) throw new Error("Not authorized");

    return ctx.db.insert("faqs", {
      ...args,
      updatedAt: Date.now(),
    });
  },
});

export const updateFAQ = mutation({
  args: {
    faqId: v.id("faqs"),
    question: v.optional(v.string()),
    answer: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, { faqId, ...args }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.isCoach) throw new Error("Not authorized");

    await ctx.db.patch(faqId, {
      ...args,
      updatedAt: Date.now(),
    });
  },
});

export const deleteFAQ = mutation({
  args: { faqId: v.id("faqs") },
  handler: async (ctx, { faqId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.isCoach) throw new Error("Not authorized");

    await ctx.db.delete(faqId);
  },
});
