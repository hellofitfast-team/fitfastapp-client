"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { ActionRetrier } from "@convex-dev/action-retrier";
import { components } from "./_generated/api";

const retrier = new ActionRetrier(components.actionRetrier, {
  initialBackoffMs: 1000,
  base: 2,
  maxFailures: 3,
});

/**
 * Called as a workflow step after plans are ready.
 * Schedules the push notification with automatic retry on failure.
 * Returns immediately with a RunId — notification delivery is fire-and-retry.
 */
export const sendPlanReadyNotification = internalAction({
  args: {
    userId: v.string(),
    mealPlanId: v.id("mealPlans"),
    workoutPlanId: v.id("workoutPlans"),
  },
  handler: async (ctx, { userId }) => {
    const subscription = await ctx.runQuery(
      internal.pushSubscriptions.getSubscriptionByUserId,
      { userId },
    );
    if (!subscription?.isActive || !subscription.onesignalSubscriptionId) return;

    await retrier.run(ctx, internal.notifications.sendPlanReadyPush, {
      subscriptionId: subscription.onesignalSubscriptionId,
    });
  },
});

export const sendPlanReadyPush = internalAction({
  args: { subscriptionId: v.string() },
  handler: async (_ctx, { subscriptionId }) => {
    await sendOneSignalNotification(subscriptionId, {
      en: "Your new meal and workout plans are ready!",
    });
  },
});

/**
 * Called by per-user dynamic cron jobs to send check-in reminders.
 */
export const sendReminderToUser = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const subscription = await ctx.runQuery(
      internal.pushSubscriptions.getSubscriptionByUserId,
      { userId },
    );

    if (subscription?.isActive && subscription.onesignalSubscriptionId) {
      await retrier.run(ctx, internal.notifications.sendReminderPush, {
        subscriptionId: subscription.onesignalSubscriptionId,
      });
    } else {
      // Fallback to email when no active push subscription
      await ctx.runAction(internal.email.sendReminderEmail, { userId });
    }
  },
});

export const sendReminderPush = internalAction({
  args: { subscriptionId: v.string() },
  handler: async (_ctx, { subscriptionId }) => {
    await sendOneSignalNotification(subscriptionId, {
      en: "Time for your check-in! Track your progress today 💪",
    });
  },
});

async function sendOneSignalNotification(
  subscriptionId: string,
  contents: { en: string; ar?: string },
) {
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  const appId = process.env.ONESIGNAL_APP_ID;
  if (!apiKey || !appId) throw new Error("OneSignal env vars not configured");

  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${apiKey}`,
    },
    body: JSON.stringify({
      app_id: appId,
      include_subscription_ids: [subscriptionId],
      contents,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OneSignal error ${res.status}: ${body}`);
  }
}
