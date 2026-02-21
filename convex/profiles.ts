import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "./auth";
import { activeClientsCount } from "./adminStats";

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const getProfileByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    // Check if caller is coach
    const callerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", callerId))
      .unique();
    if (!callerProfile?.isCoach) throw new Error("Not authorized");

    return ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const getAllClients = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.isCoach) throw new Error("Not authorized");

    return ctx.db
      .query("profiles")
      .withIndex("by_isCoach", (q) => q.eq("isCoach", false))
      .collect();
  },
});

export const updateProfile = mutation({
  args: {
    fullName: v.optional(v.string()),
    phone: v.optional(v.string()),
    language: v.optional(v.union(v.literal("en"), v.literal("ar"))),
    notificationReminderTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new Error("Profile not found");

    await ctx.db.patch(profile._id, {
      ...args,
      updatedAt: Date.now(),
    });
  },
});

export const updateClientStatus = mutation({
  args: {
    profileId: v.id("profiles"),
    status: v.union(
      v.literal("pending_approval"),
      v.literal("active"),
      v.literal("inactive"),
      v.literal("expired"),
    ),
    planTier: v.optional(
      v.union(
        v.literal("3_months"),
        v.literal("6_months"),
        v.literal("12_months"),
      ),
    ),
    planStartDate: v.optional(v.string()),
    planEndDate: v.optional(v.string()),
  },
  handler: async (ctx, { profileId, ...args }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const callerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!callerProfile?.isCoach) throw new Error("Not authorized");

    // Maintain the active clients count as status changes
    if (args.status !== undefined) {
      const existing = await ctx.db.get(profileId);
      const wasActive = existing?.status === "active";
      const isNowActive = args.status === "active";

      if (!wasActive && isNowActive) {
        await activeClientsCount.insert(ctx, { key: profileId, id: profileId });
      } else if (wasActive && !isNowActive) {
        await activeClientsCount.deleteIfExists(ctx, { key: profileId, id: profileId });
      }
    }

    await ctx.db.patch(profileId, { ...args, updatedAt: Date.now() });
  },
});

// Internal: called from Clerk webhook when a new user signs up
export const createProfileForNewUser = internalMutation({
  args: {
    userId: v.string(),
    email: v.optional(v.string()),
    fullName: v.optional(v.string()),
  },
  handler: async (ctx, { userId, email, fullName }) => {
    await ctx.db.insert("profiles", {
      userId,
      email,
      fullName,
      language: "en",
      status: "pending_approval",
      isCoach: false,
      updatedAt: Date.now(),
    });
  },
});

// Internal: called from Clerk webhook when a user is updated
export const updateProfileFromClerk = internalMutation({
  args: {
    userId: v.string(),
    fullName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { userId, fullName, phone, email }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) return;

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (fullName !== undefined) updates.fullName = fullName;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;

    await ctx.db.patch(profile._id, updates);
  },
});

// Internal: called from Clerk webhook when a user is deleted
export const deleteProfileFromClerk = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) return;

    await ctx.db.delete(profile._id);
  },
});
