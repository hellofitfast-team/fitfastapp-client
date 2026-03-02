import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "./auth";

/** Coach-only: returns last 50 notification logs ordered by sentAt desc */
export const getNotificationLogs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.isCoach) throw new Error("Not authorized");

    return ctx.db.query("notificationLog").withIndex("by_sentAt").order("desc").take(50);
  },
});

/** Internal: inserts a notification log record */
export const logNotification = internalMutation({
  args: {
    type: v.union(
      v.literal("plan_ready"),
      v.literal("reminder"),
      v.literal("broadcast"),
      v.literal("individual"),
    ),
    title: v.string(),
    body: v.string(),
    recipientCount: v.number(),
    recipientUserId: v.optional(v.string()),
    sentBy: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed"), v.literal("partial")),
    failedCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notificationLog", {
      ...args,
      sentAt: Date.now(),
    });
  },
});
