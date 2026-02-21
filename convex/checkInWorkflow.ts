import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { type Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { workflow } from "./workflowManager";

/**
 * Internal mutation: writes the check-in record.
 * Kept here (co-located with the workflow) so checkIns.ts doesn't need to
 * import from this file, breaking the TS7022 circular type inference chain.
 */
export const submitCheckInInternal = internalMutation({
  args: {
    userId: v.string(),
    weight: v.optional(v.number()),
    measurements: v.optional(v.any()),
    workoutPerformance: v.optional(v.string()),
    energyLevel: v.optional(v.number()),
    sleepQuality: v.optional(v.number()),
    dietaryAdherence: v.optional(v.number()),
    newInjuries: v.optional(v.string()),
    progressPhotoIds: v.optional(v.array(v.id("_storage"))),
    notes: v.optional(v.string()),
  },
  returns: v.id("checkIns"),
  handler: async (ctx, { userId, ...fields }) => {
    return ctx.db.insert("checkIns", { userId, ...fields });
  },
});

/**
 * Durable workflow: check-in submission → parallel AI plan generation → notification.
 *
 * AI generation is routed through the Workpool (maxParallelism: 5) so that
 * even if 50 clients check in simultaneously, only 5 OpenRouter calls run
 * concurrently. The rest queue and execute as slots free up.
 *
 * Start from a mutation via:
 *   await workflow.start(ctx, internal.checkInWorkflow.checkInAndGeneratePlans, args)
 */
export const checkInAndGeneratePlans = workflow.define({
  args: {
    userId: v.string(),
    language: v.union(v.literal("en"), v.literal("ar")),
    planDuration: v.optional(v.number()),
    weight: v.optional(v.number()),
    measurements: v.optional(v.any()),
    workoutPerformance: v.optional(v.string()),
    energyLevel: v.optional(v.number()),
    sleepQuality: v.optional(v.number()),
    dietaryAdherence: v.optional(v.number()),
    newInjuries: v.optional(v.string()),
    progressPhotoIds: v.optional(v.array(v.id("_storage"))),
    notes: v.optional(v.string()),
  },
  handler: async (
    step,
    { userId, language, planDuration = 14, ...checkInFields },
  ): Promise<{
    checkInId: Id<"checkIns">;
    mealPlanId: Id<"mealPlans">;
    workoutPlanId: Id<"workoutPlans">;
  }> => {
    // Step 1: Persist the check-in record
    const checkInId = await step.runMutation(
      internal.checkInWorkflow.submitCheckInInternal,
      { userId, ...checkInFields },
    );

    // Steps 2 & 3: Enqueue both AI generations via Workpool (max 5 concurrent)
    const [mealWorkId, workoutWorkId] = await Promise.all([
      step.runMutation(internal.workpoolManager.enqueueMealPlan, {
        userId,
        checkInId,
        language,
        planDuration,
      }),
      step.runMutation(internal.workpoolManager.enqueueWorkoutPlan, {
        userId,
        checkInId,
        language,
        planDuration,
      }),
    ]);

    // Steps 4 & 5: Poll workpool until both finish
    // The workflow's built-in step retry handles the polling loop
    let mealStatus = await step.runQuery(
      internal.workpoolManager.getWorkStatus,
      { workId: mealWorkId },
    );
    while (mealStatus?.state !== "finished") {
      mealStatus = await step.runQuery(
        internal.workpoolManager.getWorkStatus,
        { workId: mealWorkId },
      );
    }

    let workoutStatus = await step.runQuery(
      internal.workpoolManager.getWorkStatus,
      { workId: workoutWorkId },
    );
    while (workoutStatus?.state !== "finished") {
      workoutStatus = await step.runQuery(
        internal.workpoolManager.getWorkStatus,
        { workId: workoutWorkId },
      );
    }

    // Extract plan IDs from workpool results
    const mealPlanId = (mealStatus as any)?.result as unknown as Id<"mealPlans">;
    const workoutPlanId = (workoutStatus as any)?.result as unknown as Id<"workoutPlans">;

    if (!mealPlanId || !workoutPlanId) {
      throw new Error("AI plan generation failed in workpool");
    }

    // Step 6: Notify user via push
    await step.runAction(internal.notifications.sendPlanReadyNotification, {
      userId,
      mealPlanId,
      workoutPlanId,
    });

    // Step 7: Email fallback — sends only if user has no active push subscription
    await step.runAction(internal.email.sendPlanReadyEmail, { userId });

    return { checkInId, mealPlanId, workoutPlanId };
  },
});
