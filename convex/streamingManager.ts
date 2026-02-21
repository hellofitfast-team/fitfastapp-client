import { PersistentTextStreaming } from "@convex-dev/persistent-text-streaming";
import { components } from "./_generated/api";
import { query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "./auth";

/**
 * Singleton PersistentTextStreaming instance.
 */
export const streaming = new PersistentTextStreaming(
  components.persistentTextStreaming,
);

// Thin wrappers so "use node" actions can create/read streams via ctx.runMutation/runQuery

export const createStream = internalMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx): Promise<string> => {
    return streaming.createStream(ctx) as unknown as string;
  },
});

export const getStreamBody = internalQuery({
  args: { streamId: v.string() },
  handler: async (ctx, { streamId }) => {
    return streaming.getStreamBody(ctx, streamId as any);
  },
});

// Public query for client-side streaming UI — requires auth
export const getStreamBodyPublic = query({
  args: { streamId: v.string() },
  handler: async (ctx, { streamId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return streaming.getStreamBody(ctx, streamId as any);
  },
});
