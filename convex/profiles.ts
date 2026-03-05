import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
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

    // Capped at 1500 to prevent unbounded live subscriptions at scale
    return ctx.db
      .query("profiles")
      .withIndex("by_isCoach", (q) => q.eq("isCoach", false))
      .take(1500);
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
    planTier: v.optional(v.union(v.literal("monthly"), v.literal("quarterly"))),
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

    // Track inactiveSince for data retention policy (90-day cleanup)
    const patchData: Record<string, unknown> = { ...args, updatedAt: Date.now() };
    if (args.status === "inactive" || args.status === "expired") {
      patchData.inactiveSince = Date.now();
    } else if (args.status === "active") {
      // Clear inactiveSince on reactivation
      patchData.inactiveSince = undefined;
    }

    await ctx.db.patch(profileId, patchData);
  },
});

export const rejectClient = mutation({
  args: {
    profileId: v.id("profiles"),
    rejectionReason: v.string(),
  },
  handler: async (ctx, { profileId, rejectionReason }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const callerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!callerProfile?.isCoach) throw new Error("Not authorized");

    const profile = await ctx.db.get(profileId);
    if (!profile) throw new Error("Profile not found");

    // Schedule rejection email before deleting
    if (profile.email) {
      await ctx.scheduler.runAfter(0, internal.email.sendRejectionEmail, {
        email: profile.email,
        fullName: profile.fullName ?? "there",
        rejectionReason,
        language: profile.language ?? "en",
      });
    }

    // Remove from active count if applicable
    if (profile.status === "active") {
      await activeClientsCount.deleteIfExists(ctx, { key: profileId, id: profileId });
    }

    // Cascade-delete all user data (profile, plans, check-ins, tickets, files, etc.)
    await ctx.scheduler.runAfter(0, internal.dataRetention.cascadeDeleteUser, {
      userId: profile.userId,
      profileId: profile._id,
    });
  },
});

// Internal: create a profile for a new user (called during signup acceptance)
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

// Called by auth.ts afterUserCreatedOrUpdated callback via scheduler
export const onNewUserCreated = internalMutation({
  args: {
    userId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, { userId, email }) => {
    // Check if a profile already exists
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (existing) return;

    // Check if this user came from an approved pending signup (invite flow)
    const signup = await ctx.db
      .query("pendingSignups")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (signup && signup.status === "approved") {
      // Create profile from the approved signup data
      const planMonths = signup.planTier === "quarterly" ? 3 : 1;
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + planMonths);

      const profileId = await ctx.db.insert("profiles", {
        userId,
        email: signup.email,
        fullName: signup.fullName,
        language: "en",
        status: "active",
        isCoach: false,
        planTier: signup.planTier,
        planStartDate: new Date().toISOString().split("T")[0],
        planEndDate: endDate.toISOString().split("T")[0],
        updatedAt: Date.now(),
      });

      // Maintain active clients aggregate counter
      await activeClientsCount.insert(ctx, { key: profileId, id: profileId });

      // Mark invite token as used
      if (signup.inviteToken) {
        await ctx.db.patch(signup._id, {
          inviteToken: undefined,
        });
      }
    } else {
      // Fallback: create a basic pending profile
      await ctx.db.insert("profiles", {
        userId,
        email,
        language: "en",
        status: "pending_approval",
        isCoach: false,
        updatedAt: Date.now(),
      });
    }
  },
});
