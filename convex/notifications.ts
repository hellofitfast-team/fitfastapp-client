"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { ActionRetrier } from "@convex-dev/action-retrier";
import { components } from "./_generated/api";
import webpush from "web-push";

const retrier = new ActionRetrier(components.actionRetrier, {
  initialBackoffMs: 1000,
  base: 2,
  maxFailures: 3,
});

function getWebPushConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:noreply@fitfast.app";

  if (!publicKey || !privateKey) {
    throw new Error("VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars not configured");
  }

  return { publicKey, privateKey, subject };
}

/** Check if the global notifications toggle is enabled */
async function isNotificationsEnabled(ctx: {
  runQuery: (
    ref: typeof internal.systemConfig.getConfigInternal,
    args: { key: string },
  ) => Promise<{ value: unknown } | null>;
}): Promise<boolean> {
  const config = await ctx.runQuery(internal.systemConfig.getConfigInternal, {
    key: "notifications_enabled",
  });
  // Default to enabled if no config exists
  return config?.value !== false;
}

/**
 * Called as a workflow step after plans are ready.
 * Schedules the push notification with automatic retry on failure.
 */
export const sendPlanReadyNotification = internalAction({
  args: {
    userId: v.string(),
    mealPlanId: v.id("mealPlans"),
    workoutPlanId: v.id("workoutPlans"),
  },
  handler: async (ctx, { userId }) => {
    // Check global toggle and fetch subscription in parallel
    const [enabled, subscription] = await Promise.all([
      isNotificationsEnabled(ctx),
      ctx.runQuery(internal.pushSubscriptions.getSubscriptionByUserId, { userId }),
    ]);
    if (!enabled) return;
    if (!subscription?.isActive || !subscription.endpoint) return;

    const title = "FitFast";
    const body = "Your new meal and workout plans are ready!";

    try {
      await retrier.run(ctx, internal.notifications.sendPushToEndpoint, {
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
        title,
        body,
        url: "/",
      });

      await ctx.runMutation(internal.notificationLog.logNotification, {
        type: "plan_ready",
        title,
        body,
        recipientCount: 1,
        recipientUserId: userId,
        sentBy: "system",
        status: "sent",
      });
    } catch {
      await ctx.runMutation(internal.notificationLog.logNotification, {
        type: "plan_ready",
        title,
        body,
        recipientCount: 1,
        recipientUserId: userId,
        sentBy: "system",
        status: "failed",
        failedCount: 1,
      });
    }
  },
});

/**
 * Generic push action: sends a web push notification and auto-deactivates expired subscriptions.
 * Used by orchestrators (sendPlanReadyNotification, sendReminderToUser) via the retrier.
 */
export const sendPushToEndpoint = internalAction({
  args: {
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, { endpoint, p256dh, auth, title, body, url }) => {
    try {
      await sendWebPushNotification({ endpoint, p256dh, auth }, { title, body, url });
    } catch (err) {
      if (err instanceof SubscriptionExpiredError) {
        await ctx.runMutation(internal.pushSubscriptions.deactivateByEndpoint, { endpoint });
        return; // Don't re-throw — stops the retrier
      }
      throw err;
    }
  },
});

/**
 * Called by per-user dynamic cron jobs to send check-in reminders.
 */
export const sendReminderToUser = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Check global toggle and fetch subscription in parallel
    const [enabled, subscription] = await Promise.all([
      isNotificationsEnabled(ctx),
      ctx.runQuery(internal.pushSubscriptions.getSubscriptionByUserId, { userId }),
    ]);

    const title = "FitFast";
    const body = "Time for your check-in! Track your progress today";

    if (enabled && subscription?.isActive && subscription.endpoint) {
      try {
        await retrier.run(ctx, internal.notifications.sendPushToEndpoint, {
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
          title,
          body,
          url: "/check-in",
        });

        await ctx.runMutation(internal.notificationLog.logNotification, {
          type: "reminder",
          title,
          body,
          recipientCount: 1,
          recipientUserId: userId,
          sentBy: "system",
          status: "sent",
        });
      } catch {
        await ctx.runMutation(internal.notificationLog.logNotification, {
          type: "reminder",
          title,
          body,
          recipientCount: 1,
          recipientUserId: userId,
          sentBy: "system",
          status: "failed",
          failedCount: 1,
        });
      }
    } else {
      // Fallback to email when no active push subscription or notifications disabled
      await ctx.runAction(internal.email.sendReminderEmail, { userId });
    }
  },
});

/** Sentinel error class for expired subscriptions (410 Gone / 404 Not Found) */
export class SubscriptionExpiredError extends Error {
  endpoint: string;
  constructor(endpoint: string) {
    super(`Push subscription expired (410/404): ${endpoint}`);
    this.name = "SubscriptionExpiredError";
    this.endpoint = endpoint;
  }
}

let vapidConfigured = false;
function ensureVapidConfigured() {
  if (vapidConfigured) return;
  const { publicKey, privateKey, subject } = getWebPushConfig();
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

/** Exported for use by adminNotifications.ts */
export async function sendWebPushNotification(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string },
) {
  ensureVapidConfigured();

  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 410 || statusCode === 404) {
      throw new SubscriptionExpiredError(sub.endpoint);
    }
    throw err;
  }
}
