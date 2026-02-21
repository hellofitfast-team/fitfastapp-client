import { Crons } from "@convex-dev/crons";
import { components, internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const dynamicCrons = new Crons(components.crons);

/**
 * Register (or replace) a daily push reminder for a specific user.
 * Called when a user sets or updates their `notificationReminderTime`.
 *
 * Time is interpreted as UTC — the UI should convert from the user's
 * local timezone before saving.
 */
export const scheduleUserReminder = internalMutation({
  args: {
    userId: v.string(),
    reminderTime: v.string(), // "HH:MM" in UTC
  },
  handler: async (ctx, { userId, reminderTime }) => {
    const [hourStr, minuteStr] = reminderTime.split(":");
    const hour = parseInt(hourStr!, 10);
    const minute = parseInt(minuteStr!, 10);

    const cronName = `reminder-${userId}`;

    // Remove any existing cron for this user before re-registering
    const existing = await dynamicCrons.get(ctx, { name: cronName });
    if (existing) {
      await dynamicCrons.delete(ctx, { name: cronName });
    }

    await dynamicCrons.register(
      ctx,
      { kind: "cron", cronspec: `${minute} ${hour} * * *` },
      internal.notifications.sendReminderToUser,
      { userId },
      cronName,
    );
  },
});

/**
 * Cancel a user's reminder cron (e.g., when they deactivate or turn off notifications).
 */
export const cancelUserReminder = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const existing = await dynamicCrons.get(ctx, { name: `reminder-${userId}` });
    if (existing) {
      await dynamicCrons.delete(ctx, { name: `reminder-${userId}` });
    }
  },
});

/**
 * List all currently scheduled reminder crons — useful for coach dashboard debugging.
 */
export const listUserReminders = internalQuery({
  args: {},
  handler: async (ctx) => {
    return dynamicCrons.list(ctx);
  },
});
