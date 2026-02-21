import {
  mutation,
  query,
  internalAction,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "./auth";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: {
    purpose: v.optional(v.string()),
  },
  handler: async (ctx, { purpose }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return ctx.storage.generateUploadUrl();
  },
});

/**
 * After the client uploads a file using the URL from generateUploadUrl,
 * it calls this to associate the storageId with metadata.
 */
export const trackUploadedFile = mutation({
  args: {
    storageId: v.id("_storage"),
    purpose: v.string(),
  },
  handler: async (ctx, { storageId, purpose }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.insert("fileMetadata", {
      storageId,
      uploadedBy: userId,
      uploadedAt: Date.now(),
      purpose,
    });
  },
});

export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Check access: coaches can access anything, clients only their own files
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!profile?.isCoach) {
      const meta = await ctx.db
        .query("fileMetadata")
        .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
        .first();
      if (meta && meta.uploadedBy !== userId) return null;
    }

    return ctx.storage.getUrl(storageId);
  },
});

/**
 * Cleanup orphaned storage files — files uploaded but never referenced.
 * Runs daily via static cron. Checks for fileMetadata entries older than
 * 24h whose storageId isn't used in checkIns, tickets, pendingSignups,
 * or coachKnowledge.
 */
export const runOrphanedStorageCleanup = internalAction({
  args: {},
  handler: async (ctx) => {
    const orphans: string[] = await ctx.runQuery(
      internal.storage.findOrphanedFiles,
    );

    for (const metaId of orphans) {
      await ctx.runMutation(internal.storage.deleteOrphanedFile, {
        metaId: metaId as any,
      });
    }
  },
});

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

/**
 * Find fileMetadata entries older than 24h that aren't referenced anywhere.
 */
export const findOrphanedFiles = internalQuery({
  args: {},
  handler: async (ctx): Promise<string[]> => {
    const cutoff = Date.now() - TWENTY_FOUR_HOURS;
    const allMeta = await ctx.db.query("fileMetadata").collect();
    const oldMeta = allMeta.filter((m) => m.uploadedAt < cutoff);

    const orphanIds: string[] = [];

    // Pre-fetch all check-ins once (avoids N+1 queries)
    const allCheckIns = await ctx.db.query("checkIns").collect();

    for (const meta of oldMeta) {
      const usedInPhotos = allCheckIns.some(
        (ci) => ci.progressPhotoIds?.includes(meta.storageId),
      );

      const usedInTicket = await ctx.db
        .query("tickets")
        .filter((q) => q.eq(q.field("screenshotId"), meta.storageId))
        .first();

      const usedInSignup = await ctx.db
        .query("pendingSignups")
        .filter((q) => q.eq(q.field("paymentScreenshotId"), meta.storageId))
        .first();

      const usedInKnowledge = await ctx.db
        .query("coachKnowledge")
        .filter((q) => q.eq(q.field("storageId"), meta.storageId))
        .first();

      if (!usedInPhotos && !usedInTicket && !usedInSignup && !usedInKnowledge) {
        orphanIds.push(meta._id);
      }
    }

    return orphanIds;
  },
});

export const deleteOrphanedFile = internalMutation({
  args: { metaId: v.id("fileMetadata") },
  handler: async (ctx, { metaId }) => {
    const meta = await ctx.db.get(metaId);
    if (!meta) return;

    await ctx.storage.delete(meta.storageId);
    await ctx.db.delete(metaId);
  },
});
