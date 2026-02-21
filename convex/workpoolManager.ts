import { Workpool } from "@convex-dev/workpool";
import { components } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Singleton Workpool for AI generation actions.
 * Caps concurrent DeepSeek/OpenRouter calls at 5, even if 50+ clients
 * submit check-ins simultaneously. Excess requests queue automatically.
 */
export const aiWorkpool = new Workpool(components.aiWorkpool, {
  maxParallelism: 5,
});

// ---------------------------------------------------------------------------
// Enqueue helpers — called from workflow steps via step.runMutation()
// ---------------------------------------------------------------------------

export const enqueueMealPlan = internalMutation({
  args: {
    userId: v.string(),
    checkInId: v.optional(v.id("checkIns")),
    language: v.union(v.literal("en"), v.literal("ar")),
    planDuration: v.optional(v.number()),
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const workId = await aiWorkpool.enqueueAction(
      ctx,
      internal.ai.generateMealPlanInternal,
      args,
    );
    return workId as unknown as string;
  },
});

export const enqueueWorkoutPlan = internalMutation({
  args: {
    userId: v.string(),
    checkInId: v.optional(v.id("checkIns")),
    language: v.union(v.literal("en"), v.literal("ar")),
    planDuration: v.optional(v.number()),
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const workId = await aiWorkpool.enqueueAction(
      ctx,
      internal.ai.generateWorkoutPlanInternal,
      args,
    );
    return workId as unknown as string;
  },
});

// ---------------------------------------------------------------------------
// Status check — called from workflow steps via step.runQuery()
// ---------------------------------------------------------------------------

export const getWorkStatus = internalQuery({
  args: { workId: v.string() },
  handler: async (ctx, { workId }) => {
    return aiWorkpool.status(ctx, workId as any);
  },
});
