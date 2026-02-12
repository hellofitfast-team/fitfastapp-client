import { z } from 'zod';

/**
 * Schema for subscribing to push notifications.
 * Used by /api/notifications/subscribe route.
 */
export const SubscriptionSchema = z.object({
  onesignal_subscription_id: z.string().min(1, 'Subscription ID is required'),
  device_type: z.string().optional().default('web'),
});

export type SubscriptionInput = z.infer<typeof SubscriptionSchema>;

/**
 * Schema for unsubscribing from push notifications.
 * Used by /api/notifications/unsubscribe route.
 */
export const UnsubscribeSchema = z.object({
  onesignal_subscription_id: z.string().min(1, 'Subscription ID is required'),
});

export type UnsubscribeInput = z.infer<typeof UnsubscribeSchema>;

/**
 * Schema for updating reminder time.
 * Used by /api/notifications/update-reminder-time route.
 */
export const ReminderTimeSchema = z.object({
  reminder_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format. Use HH:MM'),
});

export type ReminderTimeInput = z.infer<typeof ReminderTimeSchema>;
