import { z } from 'zod';

/**
 * Schema for magic link sign-in.
 * Used by /api/auth/signin route.
 */
export const SignInSchema = z.object({
  email: z.string().email('Invalid email address'),
  locale: z.enum(['en', 'ar']).optional().default('en'),
});

export type SignInInput = z.infer<typeof SignInSchema>;
