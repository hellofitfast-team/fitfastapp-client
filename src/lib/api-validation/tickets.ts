import { z } from 'zod';

/**
 * Schema for creating support tickets.
 * Used by /api/tickets/create route.
 */
export const CreateTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200),
  category: z.enum(['plan', 'payment', 'technical', 'bug_report']),
  description: z.string().max(2000).optional(),
  screenshot_url: z.string().url().optional().nullable(),
});

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;
