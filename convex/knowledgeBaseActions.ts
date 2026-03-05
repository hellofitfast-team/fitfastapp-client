"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "./auth";
import { getRagClient } from "./ragManager";
import {
  RAG_CHUNK_SIZE_WORDS as CHUNK_SIZE,
  RAG_CHUNK_OVERLAP_WORDS as CHUNK_OVERLAP,
} from "./constants";

const NAMESPACE = "coach_knowledge";

function chunkText(text: string): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(" ");
    if (chunk.trim()) {
      chunks.push(chunk);
    }
  }

  return chunks.length > 0 ? chunks : [text];
}

// ---------------------------------------------------------------------------
// Actions (run in Node.js — "use node")
// ---------------------------------------------------------------------------

export const embedEntry = internalAction({
  args: { entryId: v.id("coachKnowledge") },
  handler: async (ctx, { entryId }): Promise<void> => {
    const entry = await ctx.runQuery(internal.knowledgeBase.getEntryInternal, { entryId });
    if (!entry?.content) return;

    const rag = getRagClient();
    const chunks = chunkText(entry.content);

    // Build filter values from entry tags for category-based retrieval
    const filterValues = (entry.tags ?? []).map((tag: string) => ({
      name: "tag" as const,
      value: tag,
    }));

    try {
      await rag.add(ctx, {
        namespace: NAMESPACE,
        key: entryId,
        title: entry.title,
        chunks,
        filterValues,
      });
    } catch (err) {
      console.error(
        `[RAG] Embedding failed for entry ${entryId} ("${entry.title}"). Entry exists but is unsearchable.`,
        err instanceof Error ? err.message : err,
      );
    }
  },
});

export const processPdfUpload = internalAction({
  args: {
    entryId: v.id("coachKnowledge"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { entryId, storageId }): Promise<void> => {
    // Download PDF from storage
    const blob = await ctx.storage.get(storageId);
    if (!blob) {
      console.error(
        `[KnowledgeBase] PDF file not found in storage (entryId: ${entryId}, storageId: ${storageId})`,
      );
      return;
    }

    let text: string;
    try {
      const buffer = Buffer.from(await blob.arrayBuffer());
      const pdfParseModule = await import("pdf-parse");
      const pdfParse =
        typeof pdfParseModule === "function" ? pdfParseModule : (pdfParseModule as any).default;
      const pdf = await pdfParse(buffer);
      text = pdf.text.trim();
    } catch (err) {
      console.error(
        `[KnowledgeBase] PDF parsing failed for entry ${entryId}. Entry created with no content.`,
        err instanceof Error ? err.message : err,
      );
      // Patch entry with empty content so it's visible in the UI as failed
      await ctx.runMutation(internal.knowledgeBase.updateKnowledgeContent, {
        entryId,
        content: "",
      });
      return;
    }

    if (!text) {
      console.warn(`[KnowledgeBase] No text extracted from PDF for entry ${entryId}`);
      await ctx.runMutation(internal.knowledgeBase.updateKnowledgeContent, {
        entryId,
        content: "",
      });
      return;
    }

    // Save extracted text to the knowledge entry
    await ctx.runMutation(internal.knowledgeBase.updateKnowledgeContent, {
      entryId,
      content: text,
    });

    // Embed the extracted text
    await ctx.runAction(internal.knowledgeBaseActions.embedEntry, { entryId });
  },
});

export const removeFromRag = internalAction({
  args: { key: v.string() },
  handler: async (ctx, { key }): Promise<void> => {
    const rag = getRagClient();
    try {
      const ns = await rag.getNamespace(ctx, { namespace: NAMESPACE });
      if (!ns) return;
      await rag.deleteByKey(ctx, {
        namespaceId: ns.namespaceId,
        key,
      });
    } catch {
      // Entry may not exist in RAG if embedding hadn't completed yet
    }
  },
});

export const searchKnowledge = internalAction({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { query, limit = 5, tags }): Promise<string[]> => {
    const rag = getRagClient();

    try {
      // Build tag filters — OR logic: matches entries with ANY of these tags
      const filters = tags?.length
        ? tags.map((tag) => ({ name: "tag" as const, value: tag }))
        : undefined;

      const result = await rag.search(ctx, {
        namespace: NAMESPACE,
        query,
        limit,
        filters,
      });

      return result.results.map((r) => r.content.map((c) => c.text).join("\n"));
    } catch {
      // RAG namespace may not exist yet (no entries added)
      return [];
    }
  },
});

/**
 * Public action for PDF upload — coach-only, creates knowledge entry + processes.
 */
export const processPdfUploadPublic = action({
  args: {
    title: v.string(),
    storageId: v.id("_storage"),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { title, storageId, tags }): Promise<void> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Coach-only guard
    const profile = await ctx.runQuery(internal.helpers.getProfileInternal, { userId });
    if (!profile?.isCoach) throw new Error("Not authorized — coach only");

    // Insert knowledge entry
    const entryId = await ctx.runMutation(internal.knowledgeBase.insertPdfEntry, {
      title,
      storageId,
      tags,
    });

    // Process PDF in background
    await ctx.scheduler.runAfter(0, internal.knowledgeBaseActions.processPdfUpload, {
      entryId,
      storageId,
    });
  },
});
