import { z } from 'zod';

/**
 * Schema for generating meal/workout plans.
 * Used by /api/check-in/generate-plans route.
 */
export const GeneratePlanSchema = z.object({
  checkInId: z.string().uuid().optional(),
  planDuration: z.coerce.number().int().min(7).max(30).default(14),
});

export type GeneratePlanInput = z.infer<typeof GeneratePlanSchema>;
