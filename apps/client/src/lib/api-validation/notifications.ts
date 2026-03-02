import { z } from "zod";

/**
 * Schema for subscribing to push notifications.
 * Uses standard Web Push subscription fields.
 */
export const SubscriptionSchema = z.object({
  endpoint: z.string().url("Valid push endpoint URL is required"),
  p256dh: z.string().min(1, "p256dh key is required"),
  auth: z.string().min(1, "auth key is required"),
  device_type: z.string().optional().default("web"),
});

export type SubscriptionInput = z.infer<typeof SubscriptionSchema>;

/**
 * Schema for unsubscribing from push notifications.
 */
export const UnsubscribeSchema = z.object({
  endpoint: z.string().url("Valid push endpoint URL is required"),
});

export type UnsubscribeInput = z.infer<typeof UnsubscribeSchema>;

/**
 * Schema for updating reminder time.
 * Used by /api/notifications/update-reminder-time route.
 */
export const ReminderTimeSchema = z.object({
  reminder_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format. Use HH:MM"),
});

export type ReminderTimeInput = z.infer<typeof ReminderTimeSchema>;
