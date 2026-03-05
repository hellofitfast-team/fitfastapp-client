import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { type Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { workflow } from "./workflowManager";
import { DEFAULT_CHECK_IN_FREQUENCY_DAYS } from "./constants";

/** Internal mutation: patches InBody OCR data onto a check-in record. */
export const patchInBodyData = internalMutation({
  args: {
    checkInId: v.id("checkIns"),
    inBodyData: v.object({
      bodyFatPercentage: v.optional(v.number()),
      leanBodyMass: v.optional(v.number()),
      skeletalMuscleMass: v.optional(v.number()),
      bmi: v.optional(v.number()),
      visceralFatLevel: v.optional(v.number()),
      basalMetabolicRate: v.optional(v.number()),
      totalBodyWater: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { checkInId, inBodyData }) => {
    const checkIn = await ctx.db.get(checkInId);
    if (!checkIn) {
      console.warn("[patchInBodyData] Check-in record no longer exists", { checkInId });
      return;
    }
    await ctx.db.patch(checkInId, { inBodyData });
  },
});

/**
 * Internal mutation: writes the check-in record.
 * Kept here (co-located with the workflow) so checkIns.ts doesn't need to
 * import from this file, breaking the TS7022 circular type inference chain.
 */
export const submitCheckInInternal = internalMutation({
  args: {
    userId: v.string(),
    weight: v.optional(v.number()),
    measurementMethod: v.optional(v.union(v.literal("manual"), v.literal("inbody"))),
    measurements: v.optional(
      v.object({
        chest: v.optional(v.number()),
        waist: v.optional(v.number()),
        hips: v.optional(v.number()),
        arms: v.optional(v.number()),
        thighs: v.optional(v.number()),
      }),
    ),
    inBodyStorageId: v.optional(v.id("_storage")),
    inBodyData: v.optional(
      v.object({
        bodyFatPercentage: v.optional(v.number()),
        leanBodyMass: v.optional(v.number()),
        skeletalMuscleMass: v.optional(v.number()),
        bmi: v.optional(v.number()),
        visceralFatLevel: v.optional(v.number()),
        basalMetabolicRate: v.optional(v.number()),
        totalBodyWater: v.optional(v.number()),
      }),
    ),
    workoutPerformance: v.optional(v.string()),
    energyLevel: v.optional(v.number()),
    sleepQuality: v.optional(v.number()),
    dietaryAdherence: v.optional(v.number()),
    newInjuries: v.optional(v.string()),
    progressPhotoIds: v.optional(v.array(v.id("_storage"))),
    progressPhotoFront: v.optional(v.id("_storage")),
    progressPhotoBack: v.optional(v.id("_storage")),
    progressPhotoSide: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
  },
  returns: v.id("checkIns"),
  handler: async (ctx, { userId, ...fields }) => {
    const checkInId = await ctx.db.insert("checkIns", {
      userId,
      submittedAt: Date.now(),
      ...fields,
    });

    // Schedule InBody OCR if photo was uploaded
    if (fields.inBodyStorageId && fields.measurementMethod === "inbody") {
      await ctx.scheduler.runAfter(0, internal.ocrExtraction.extractInBodyData, {
        checkInId,
        storageId: fields.inBodyStorageId,
      });
    }

    return checkInId;
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
    measurementMethod: v.optional(v.union(v.literal("manual"), v.literal("inbody"))),
    measurements: v.optional(
      v.object({
        chest: v.optional(v.number()),
        waist: v.optional(v.number()),
        hips: v.optional(v.number()),
        arms: v.optional(v.number()),
        thighs: v.optional(v.number()),
      }),
    ),
    inBodyStorageId: v.optional(v.id("_storage")),
    inBodyData: v.optional(
      v.object({
        bodyFatPercentage: v.optional(v.number()),
        leanBodyMass: v.optional(v.number()),
        skeletalMuscleMass: v.optional(v.number()),
        bmi: v.optional(v.number()),
        visceralFatLevel: v.optional(v.number()),
        basalMetabolicRate: v.optional(v.number()),
        totalBodyWater: v.optional(v.number()),
      }),
    ),
    workoutPerformance: v.optional(v.string()),
    energyLevel: v.optional(v.number()),
    sleepQuality: v.optional(v.number()),
    dietaryAdherence: v.optional(v.number()),
    newInjuries: v.optional(v.string()),
    progressPhotoIds: v.optional(v.array(v.id("_storage"))),
    progressPhotoFront: v.optional(v.id("_storage")),
    progressPhotoBack: v.optional(v.id("_storage")),
    progressPhotoSide: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
  },
  handler: async (
    step,
    { userId, language, planDuration = DEFAULT_CHECK_IN_FREQUENCY_DAYS, ...checkInFields },
  ): Promise<{
    checkInId: Id<"checkIns">;
    mealPlanId: Id<"mealPlans">;
    workoutPlanId: Id<"workoutPlans">;
  }> => {
    // Step 1: Persist the check-in record
    const checkInId = await step.runMutation(internal.checkInWorkflow.submitCheckInInternal, {
      userId,
      ...checkInFields,
    });

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
    // Workpool states: "pending" | "running" | "finished".
    // Bounded polling prevents infinite hangs if workpool entry is lost or action crashes.
    const MAX_POLL_ATTEMPTS = 60;

    let mealStatus = await step.runQuery(internal.workpoolManager.getWorkStatus, {
      workId: mealWorkId,
    });
    let mealPollCount = 0;
    while (mealStatus?.state !== "finished") {
      mealPollCount++;
      if (mealStatus === null) {
        throw new Error(`Meal plan workpool entry lost (workId: ${mealWorkId})`);
      }
      if (mealPollCount >= MAX_POLL_ATTEMPTS) {
        throw new Error(
          `Meal plan generation timed out after ${MAX_POLL_ATTEMPTS} poll attempts (last state: ${mealStatus?.state})`,
        );
      }
      await step.sleep(5000);
      mealStatus = await step.runQuery(internal.workpoolManager.getWorkStatus, {
        workId: mealWorkId,
      });
    }

    let workoutStatus = await step.runQuery(internal.workpoolManager.getWorkStatus, {
      workId: workoutWorkId,
    });
    let workoutPollCount = 0;
    while (workoutStatus?.state !== "finished") {
      workoutPollCount++;
      if (workoutStatus === null) {
        throw new Error(`Workout plan workpool entry lost (workId: ${workoutWorkId})`);
      }
      if (workoutPollCount >= MAX_POLL_ATTEMPTS) {
        throw new Error(
          `Workout plan generation timed out after ${MAX_POLL_ATTEMPTS} poll attempts (last state: ${workoutStatus?.state})`,
        );
      }
      await step.sleep(5000);
      workoutStatus = await step.runQuery(internal.workpoolManager.getWorkStatus, {
        workId: workoutWorkId,
      });
    }

    // Extract plan IDs from workpool results
    const mealPlanId = (mealStatus as Record<string, unknown>)?.result as Id<"mealPlans">;
    const workoutPlanId = (workoutStatus as Record<string, unknown>)?.result as Id<"workoutPlans">;

    if (!mealPlanId || !workoutPlanId) {
      throw new Error("AI plan generation failed in workpool");
    }

    // Step 6: Notify user via push (best-effort — plans are already saved)
    try {
      await step.runAction(internal.notifications.sendPlanReadyNotification, {
        userId,
        mealPlanId,
        workoutPlanId,
      });
    } catch (err) {
      console.error(
        `[Workflow] Push notification failed for user ${userId}, continuing to email fallback`,
        err,
      );
    }

    // Step 7: Email fallback — sends only if user has no active push subscription
    try {
      await step.runAction(internal.email.sendPlanReadyEmail, { userId });
    } catch (err) {
      console.error(
        `[Workflow] Email fallback failed for user ${userId}. Plans are saved — user will see them in-app.`,
        err,
      );
    }

    return { checkInId, mealPlanId, workoutPlanId };
  },
});
