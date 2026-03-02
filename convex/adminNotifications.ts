"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "./auth";
import { sendWebPushNotification, SubscriptionExpiredError } from "./notifications";

/** Coach action: send push notification to a single client */
export const sendToIndividual = action({
  args: {
    userId: v.string(),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, { userId, title, body }) => {
    const coachId = await getAuthUserId(ctx);
    if (!coachId) throw new Error("Not authenticated");

    const profile = await ctx.runQuery(internal.helpers.getProfileInternal, {
      userId: coachId,
    });
    if (!profile?.isCoach) throw new Error("Not authorized");

    // Check global toggle
    const config = await ctx.runQuery(internal.systemConfig.getConfigInternal, {
      key: "notifications_enabled",
    });
    if (config?.value === false) {
      throw new Error("Notifications are currently disabled");
    }

    // Look up subscription
    const subscription = await ctx.runQuery(internal.pushSubscriptions.getSubscriptionByUserId, {
      userId,
    });

    if (!subscription?.isActive || !subscription.endpoint) {
      await ctx.runMutation(internal.notificationLog.logNotification, {
        type: "individual",
        title,
        body,
        recipientCount: 0,
        recipientUserId: userId,
        sentBy: coachId,
        status: "failed",
        failedCount: 1,
      });
      throw new Error("Client has no active push subscription");
    }

    try {
      await sendWebPushNotification(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
        { title, body, url: "/" },
      );

      await ctx.runMutation(internal.notificationLog.logNotification, {
        type: "individual",
        title,
        body,
        recipientCount: 1,
        recipientUserId: userId,
        sentBy: coachId,
        status: "sent",
      });
    } catch (err) {
      if (err instanceof SubscriptionExpiredError) {
        await ctx.runMutation(internal.pushSubscriptions.deactivateByEndpoint, {
          endpoint: subscription.endpoint,
        });
      }
      await ctx.runMutation(internal.notificationLog.logNotification, {
        type: "individual",
        title,
        body,
        recipientCount: 0,
        recipientUserId: userId,
        sentBy: coachId,
        status: "failed",
        failedCount: 1,
      });
      throw new Error(
        err instanceof SubscriptionExpiredError
          ? "Client's push subscription has expired"
          : "Failed to send push notification",
      );
    }
  },
});

/** Coach action: broadcast push notification to all active clients */
export const broadcastToAllActive = action({
  args: {
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, { title, body }) => {
    const coachId = await getAuthUserId(ctx);
    if (!coachId) throw new Error("Not authenticated");

    const profile = await ctx.runQuery(internal.helpers.getProfileInternal, {
      userId: coachId,
    });
    if (!profile?.isCoach) throw new Error("Not authorized");

    // Check global toggle
    const config = await ctx.runQuery(internal.systemConfig.getConfigInternal, {
      key: "notifications_enabled",
    });
    if (config?.value === false) {
      throw new Error("Notifications are currently disabled");
    }

    const subscriptions = await ctx.runQuery(internal.pushSubscriptions.getAllActiveSubscriptions);

    if (subscriptions.length === 0) {
      await ctx.runMutation(internal.notificationLog.logNotification, {
        type: "broadcast",
        title,
        body,
        recipientCount: 0,
        sentBy: coachId,
        status: "sent",
      });
      return { sent: 0, failed: 0 };
    }

    let sentCount = 0;
    let failedCount = 0;

    // Process in chunks of 50
    const CHUNK_SIZE = 50;
    const expiredEndpoints: string[] = [];

    for (let i = 0; i < subscriptions.length; i += CHUNK_SIZE) {
      const chunk = subscriptions.slice(i, i + CHUNK_SIZE);
      const results = await Promise.allSettled(
        chunk.map((sub) =>
          sendWebPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            { title, body, url: "/" },
          ),
        ),
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status === "fulfilled") {
          sentCount++;
        } else {
          failedCount++;
          if (result.reason instanceof SubscriptionExpiredError) {
            expiredEndpoints.push(chunk[j].endpoint);
          }
        }
      }
    }

    // Deactivate all expired subscriptions in parallel
    await Promise.all(
      expiredEndpoints.map((endpoint) =>
        ctx.runMutation(internal.pushSubscriptions.deactivateByEndpoint, { endpoint }),
      ),
    );

    const status =
      failedCount === 0
        ? ("sent" as const)
        : sentCount === 0
          ? ("failed" as const)
          : ("partial" as const);

    await ctx.runMutation(internal.notificationLog.logNotification, {
      type: "broadcast",
      title,
      body,
      recipientCount: sentCount,
      sentBy: coachId,
      status,
      failedCount: failedCount > 0 ? failedCount : undefined,
    });

    return { sent: sentCount, failed: failedCount };
  },
});
