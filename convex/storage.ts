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
    purpose: v.optional(
      v.union(
        v.literal("progress_photo"),
        v.literal("ticket_screenshot"),
        v.literal("payment_proof"),
        v.literal("knowledge_pdf"),
      ),
    ),
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
    purpose: v.union(
      v.literal("progress_photo"),
      v.literal("ticket_screenshot"),
      v.literal("payment_proof"),
      v.literal("knowledge_pdf"),
    ),
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

export const getFileUrlsBatch = query({
  args: { storageIds: v.array(v.id("_storage")) },
  handler: async (ctx, { storageIds }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return {};

    const urls: Record<string, string | null> = {};
    for (const id of storageIds) {
      urls[id] = await ctx.storage.getUrl(id);
    }
    return urls;
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
    const orphans: string[] = await ctx.runQuery(internal.storage.findOrphanedFiles);

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
 * Uses by_uploadedAt index to only load old entries (avoids full scan).
 * Builds a Set of all referenced storageIds to check membership in O(1).
 */
export const findOrphanedFiles = internalQuery({
  args: {},
  handler: async (ctx): Promise<string[]> => {
    const cutoff = Date.now() - TWENTY_FOUR_HOURS;

    // Only load metadata older than 24h using the index (ascending order,
    // take while uploadedAt < cutoff)
    const oldMeta = await ctx.db
      .query("fileMetadata")
      .withIndex("by_uploadedAt")
      .filter((q) => q.lt(q.field("uploadedAt"), cutoff))
      .collect();

    if (oldMeta.length === 0) return [];

    // Build a Set of all referenced storageIds from the tables that reference _storage
    const referencedIds = new Set<string>();

    // Check-ins: front/back/side photos + legacy progressPhotoIds
    const allCheckIns = await ctx.db.query("checkIns").collect();
    for (const ci of allCheckIns) {
      if (ci.progressPhotoFront) referencedIds.add(ci.progressPhotoFront);
      if (ci.progressPhotoBack) referencedIds.add(ci.progressPhotoBack);
      if (ci.progressPhotoSide) referencedIds.add(ci.progressPhotoSide);
      if (ci.inBodyStorageId) referencedIds.add(ci.inBodyStorageId);
      if (ci.progressPhotoIds) {
        for (const id of ci.progressPhotoIds) referencedIds.add(id);
      }
    }

    // Tickets
    const allTickets = await ctx.db.query("tickets").collect();
    for (const t of allTickets) {
      if (t.screenshotId) referencedIds.add(t.screenshotId);
    }

    // Pending signups
    const allSignups = await ctx.db.query("pendingSignups").collect();
    for (const s of allSignups) {
      if (s.paymentScreenshotId) referencedIds.add(s.paymentScreenshotId);
    }

    // Coach knowledge
    const allKnowledge = await ctx.db.query("coachKnowledge").collect();
    for (const k of allKnowledge) {
      if (k.storageId) referencedIds.add(k.storageId);
    }

    // Filter: old metadata whose storageId is not referenced anywhere
    return oldMeta.filter((meta) => !referencedIds.has(meta.storageId)).map((meta) => meta._id);
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
