import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "./auth";
import { pendingSignupsCount } from "./adminStats";
import { rateLimiter } from "./rateLimiter";

export const getPendingSignups = query({
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
      .query("pendingSignups")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
  },
});

export const getAllSignups = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.isCoach) throw new Error("Not authorized");

    // Capped at 500 most recent signups to prevent unbounded queries
    const signups = await ctx.db.query("pendingSignups").order("desc").take(500);
    return signups;
  },
});

export const getSignupById = query({
  args: { signupId: v.id("pendingSignups") },
  handler: async (ctx, { signupId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.isCoach) throw new Error("Not authorized");

    return ctx.db.get(signupId);
  },
});

export const getSignupByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.isCoach) throw new Error("Not authorized");

    return ctx.db
      .query("pendingSignups")
      .withIndex("by_email", (q) => q.eq("email", email))
      .order("desc")
      .first();
  },
});

export const getSignupsByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.isCoach) throw new Error("Not authorized");

    return ctx.db
      .query("pendingSignups")
      .withIndex("by_email", (q) => q.eq("email", email))
      .order("desc")
      .collect();
  },
});

export const createSignup = mutation({
  args: {
    email: v.string(),
    fullName: v.string(),
    phone: v.optional(v.string()),
    planId: v.optional(v.string()),
    planTier: v.optional(v.union(v.literal("monthly"), v.literal("quarterly"))),
    transferReferenceNumber: v.string(),
    transferAmount: v.string(),
    paymentScreenshotId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "createSignup", { key: args.email });
    // Duplicate email guard
    const existingPending = await ctx.db
      .query("pendingSignups")
      .withIndex("by_email_status", (q) => q.eq("email", args.email).eq("status", "pending"))
      .first();
    if (existingPending) throw new Error("A signup with this email is already pending");

    const id = await ctx.db.insert("pendingSignups", { ...args, status: "pending" });
    // Increment the denormalized pending count for the admin dashboard
    await pendingSignupsCount.insert(ctx, { key: id, id });

    // Schedule OCR extraction if a payment screenshot was uploaded
    if (args.paymentScreenshotId) {
      await ctx.scheduler.runAfter(0, internal.ocrExtraction.extractPaymentData, {
        signupId: id,
        storageId: args.paymentScreenshotId,
      });
    }

    return id;
  },
});

export const approveSignup = mutation({
  args: { signupId: v.id("pendingSignups") },
  handler: async (ctx, { signupId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.isCoach) throw new Error("Not authorized");

    const signup = await ctx.db.get(signupId);
    if (!signup) throw new Error("Signup not found");

    // Generate a secure invite token
    const inviteToken =
      crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    await ctx.db.patch(signupId, {
      status: "approved",
      reviewedAt: Date.now(),
      inviteToken,
    });
    // Decrement pending count — signup is no longer "pending"
    await pendingSignupsCount.deleteIfExists(ctx, { key: signupId, id: signupId });

    // Schedule invitation email
    await ctx.scheduler.runAfter(0, internal.email.sendInvitationEmail, {
      email: signup.email,
      fullName: signup.fullName,
      inviteToken,
      language: "en" as const,
    });
  },
});

export const rejectSignup = mutation({
  args: {
    signupId: v.id("pendingSignups"),
    rejectionReason: v.string(),
  },
  handler: async (ctx, { signupId, rejectionReason }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.isCoach) throw new Error("Not authorized");

    const signup = await ctx.db.get(signupId);
    if (!signup) throw new Error("Signup not found");

    await ctx.db.patch(signupId, {
      status: "rejected",
      reviewedAt: Date.now(),
      rejectionReason,
    });
    // Decrement pending count — signup is no longer "pending"
    await pendingSignupsCount.deleteIfExists(ctx, { key: signupId, id: signupId });

    // Schedule rejection email with reason
    await ctx.scheduler.runAfter(0, internal.email.sendRejectionEmail, {
      email: signup.email,
      fullName: signup.fullName,
      rejectionReason,
      language: "en" as const,
    });
  },
});

// ---------------------------------------------------------------------------
// Renewal — existing (expired) clients submit a renewal request
// ---------------------------------------------------------------------------

export const createRenewalSignup = mutation({
  args: {
    planId: v.optional(v.string()),
    planTier: v.optional(v.union(v.literal("monthly"), v.literal("quarterly"))),
    transferReferenceNumber: v.string(),
    transferAmount: v.string(),
    paymentScreenshotId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new Error("Profile not found");
    if (profile.status !== "expired" && profile.status !== "inactive")
      throw new Error("Only expired or inactive accounts can renew");

    const email = profile.email ?? "";
    await rateLimiter.limit(ctx, "createSignup", { key: email });

    // Don't allow duplicate pending renewal
    const existingPending = await ctx.db
      .query("pendingSignups")
      .withIndex("by_email_status", (q) => q.eq("email", email).eq("status", "pending"))
      .first();
    if (existingPending) throw new Error("A renewal request is already pending");

    const id = await ctx.db.insert("pendingSignups", {
      email,
      fullName: profile.fullName ?? "Client",
      planId: args.planId,
      planTier: args.planTier,
      transferReferenceNumber: args.transferReferenceNumber,
      transferAmount: args.transferAmount,
      paymentScreenshotId: args.paymentScreenshotId,
      status: "pending",
    });

    await pendingSignupsCount.insert(ctx, { key: id, id });

    if (args.paymentScreenshotId) {
      await ctx.scheduler.runAfter(0, internal.ocrExtraction.extractPaymentData, {
        signupId: id,
        storageId: args.paymentScreenshotId,
      });
    }

    return id;
  },
});

export const getMyPendingRenewal = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.email) return null;

    return ctx.db
      .query("pendingSignups")
      .withIndex("by_email_status", (q) => q.eq("email", profile.email!).eq("status", "pending"))
      .first();
  },
});

// ---------------------------------------------------------------------------
// Invite token validation — used by client app accept-invite page
// ---------------------------------------------------------------------------

export const validateInviteToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const signup = await ctx.db
      .query("pendingSignups")
      .withIndex("by_inviteToken", (q) => q.eq("inviteToken", token))
      .unique();

    if (!signup) return null;

    return {
      email: signup.email,
      fullName: signup.fullName,
      planTier: signup.planTier,
      signupId: signup._id,
    };
  },
});

export const markInviteUsed = internalMutation({
  args: { signupId: v.id("pendingSignups") },
  handler: async (ctx, { signupId }) => {
    await ctx.db.patch(signupId, {
      inviteToken: undefined,
    });
  },
});

// ---------------------------------------------------------------------------
// Internal mutations
// ---------------------------------------------------------------------------

export const patchOcrData = internalMutation({
  args: {
    signupId: v.id("pendingSignups"),
    ocrExtractedData: v.object({
      amount: v.optional(v.string()),
      sender_name: v.optional(v.string()),
      reference_number: v.optional(v.string()),
      date: v.optional(v.string()),
      bank: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { signupId, ocrExtractedData }) => {
    await ctx.db.patch(signupId, { ocrExtractedData });
  },
});

export const patchInvitationId = internalMutation({
  args: {
    signupId: v.id("pendingSignups"),
    inviteToken: v.string(),
  },
  handler: async (ctx, { signupId, inviteToken }) => {
    await ctx.db.patch(signupId, { inviteToken });
  },
});
