import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "./auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireCoach(ctx: any): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .unique();
  if (!profile?.isCoach) throw new Error("Not authorized");
  return userId;
}

// ---------------------------------------------------------------------------
// Queries & Mutations (run in Convex runtime — no "use node")
// ---------------------------------------------------------------------------

export const listKnowledgeEntries = query({
  args: {},
  handler: async (ctx) => {
    await requireCoach(ctx);
    return ctx.db
      .query("coachKnowledge")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();
  },
});

export const addTextEntry = mutation({
  args: {
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { title, content }) => {
    await requireCoach(ctx);

    const id = await ctx.db.insert("coachKnowledge", {
      title,
      type: "text",
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Schedule embedding in background (action lives in knowledgeBaseActions.ts)
    await ctx.scheduler.runAfter(0, internal.knowledgeBaseActions.embedEntry, {
      entryId: id,
    });

    return id;
  },
});

export const deleteKnowledgeEntry = mutation({
  args: { entryId: v.id("coachKnowledge") },
  handler: async (ctx, { entryId }) => {
    await requireCoach(ctx);

    const entry = await ctx.db.get(entryId);
    if (!entry) throw new Error("Entry not found");

    // Delete from database
    await ctx.db.delete(entryId);

    // Schedule RAG deletion in background
    await ctx.scheduler.runAfter(0, internal.knowledgeBaseActions.removeFromRag, {
      key: entryId,
    });

    // Clean up storage if PDF
    if (entry.storageId) {
      await ctx.storage.delete(entry.storageId);
    }
  },
});

export const updateKnowledgeContent = internalMutation({
  args: {
    entryId: v.id("coachKnowledge"),
    content: v.string(),
  },
  handler: async (ctx, { entryId, content }) => {
    await ctx.db.patch(entryId, { content, updatedAt: Date.now() });
  },
});

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

export const getEntryInternal = internalQuery({
  args: { entryId: v.id("coachKnowledge") },
  handler: async (ctx, { entryId }) => {
    return ctx.db.get(entryId);
  },
});

export const insertPdfEntry = internalMutation({
  args: {
    title: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { title, storageId }) => {
    return ctx.db.insert("coachKnowledge", {
      title,
      type: "pdf",
      storageId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
