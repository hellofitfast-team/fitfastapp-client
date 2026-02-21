"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "./auth";
import { getRagClient } from "./ragManager";

const NAMESPACE = "coach_knowledge";
const CHUNK_SIZE = 500; // words per chunk
const CHUNK_OVERLAP = 50; // words overlap

function chunkText(text: string, title: string): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(" ");
    if (chunk.trim()) {
      chunks.push(`[${title}] ${chunk}`);
    }
  }

  return chunks.length > 0 ? chunks : [`[${title}] ${text}`];
}

// ---------------------------------------------------------------------------
// Actions (run in Node.js — "use node")
// ---------------------------------------------------------------------------

export const embedEntry = internalAction({
  args: { entryId: v.id("coachKnowledge") },
  handler: async (ctx, { entryId }): Promise<void> => {
    const entry = await ctx.runQuery(
      internal.knowledgeBase.getEntryInternal,
      { entryId },
    );
    if (!entry?.content) return;

    const rag = getRagClient();
    const chunks = chunkText(entry.content, entry.title);

    await rag.add(ctx, {
      namespace: NAMESPACE,
      key: entryId,
      title: entry.title,
      chunks,
    });
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
    if (!blob) throw new Error("PDF file not found in storage");

    const buffer = Buffer.from(await blob.arrayBuffer());
    const pdfParseModule = await import("pdf-parse");
    const pdfParse = typeof pdfParseModule === "function" ? pdfParseModule : (pdfParseModule as any).default;
    const pdf = await pdfParse(buffer);
    const text = pdf.text.trim();

    if (!text) throw new Error("No text extracted from PDF");

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
  },
  handler: async (ctx, { query, limit = 5 }): Promise<string[]> => {
    const rag = getRagClient();

    try {
      const result = await rag.search(ctx, {
        namespace: NAMESPACE,
        query,
        limit,
      });

      return result.results.map((r) =>
        r.content.map((c) => c.text).join("\n"),
      );
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
  },
  handler: async (ctx, { title, storageId }): Promise<void> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Insert knowledge entry
    const entryId = await ctx.runMutation(
      internal.knowledgeBase.insertPdfEntry,
      { title, storageId },
    );

    // Process PDF in background
    await ctx.scheduler.runAfter(0, internal.knowledgeBaseActions.processPdfUpload, {
      entryId,
      storageId,
    });
  },
});
