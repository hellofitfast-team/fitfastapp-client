import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Validates request body against a Zod schema.
 * Logs validation failures to Sentry and returns a 400 response.
 *
 * @param body - The request body to validate
 * @param schema - The Zod schema to validate against
 * @param context - Validation context (userId, feature name)
 * @returns Success object with parsed data or failure object with NextResponse
 */
export function validateRequestBody<T extends z.ZodTypeAny>(
  body: unknown,
  schema: T,
  context: { userId?: string; feature: string }
): { success: true; data: z.infer<T> } | { success: false; response: NextResponse } {
  const result = schema.safeParse(body);

  if (!result.success) {
    // Log validation failure to Sentry
    Sentry.captureException(new Error('Request validation failed'), {
      level: 'warning',
      tags: {
        feature: context.feature,
        validation: 'request-body',
      },
      extra: {
        userId: context.userId,
        errors: result.error.issues,
        body,
      },
    });

    // Return 400 response with detailed error messages
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Invalid request',
          details: result.error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      ),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

// Barrel exports for all schema files
export * from './plans';
export * from './tickets';
export * from './admin';
export * from './notifications';
export * from './auth';
