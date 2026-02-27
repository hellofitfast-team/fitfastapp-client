import { z } from "zod";

/**
 * Environment variable validation for the admin app.
 * Import this module to get type-safe access to env vars
 * and fail fast on missing required configuration.
 */
const envSchema = z.object({
  NEXT_PUBLIC_CONVEX_URL: z.string().url(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
});
