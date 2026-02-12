import { backOff } from "exponential-backoff";
import * as Sentry from "@sentry/nextjs";
import { RetryError } from "./types";

/**
 * Wraps any async operation with exponential backoff retry logic.
 *
 * Automatically retries failed operations with increasing delays (1s, 2s, 4s)
 * and full jitter to prevent thundering herd problems. Each retry attempt is
 * logged to Sentry as a warning for monitoring.
 *
 * When all retry attempts are exhausted, throws a RetryError containing the
 * last error and attempt count. The RetryError is also captured to Sentry
 * with error level.
 *
 * Phase 4/5 consumers should wrap all AI API calls, Supabase queries, and
 * external HTTP requests with this utility for automatic resilience.
 *
 * @param operation - The async function to retry
 * @param options - Configuration options
 * @param options.maxAttempts - Maximum retry attempts (default: 3)
 * @param options.operationName - Name for logging/monitoring (default: "operation")
 * @param options.shouldRetry - Custom predicate to determine if error is retryable (default: always retry)
 *
 * @returns The result of the successful operation
 * @throws {RetryError} When all retry attempts are exhausted
 *
 * @example
 * ```typescript
 * // Wrap an OpenRouter API call with automatic retry
 * const response = await withRetry(
 *   async () => {
 *     const res = await fetch(OPENROUTER_URL, { ... });
 *     if (!res.ok) throw new Error(`HTTP ${res.status}`);
 *     return res.json();
 *   },
 *   {
 *     maxAttempts: 3,
 *     operationName: "openrouter-generate-meal-plan",
 *     shouldRetry: (error) => {
 *       // Only retry on network/server errors, not client errors
 *       return !error.message.includes("400") && !error.message.includes("401");
 *     }
 *   }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Wrap a Supabase query with retry
 * const profile = await withRetry(
 *   async () => {
 *     const { data, error } = await supabase
 *       .from("profiles")
 *       .select("*")
 *       .eq("id", userId)
 *       .single();
 *     if (error) throw error;
 *     return data;
 *   },
 *   { operationName: "fetch-user-profile" }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    operationName?: string;
    shouldRetry?: (error: Error) => boolean;
  }
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const operationName = options?.operationName ?? "operation";
  const shouldRetry = options?.shouldRetry ?? (() => true);

  let lastError: Error | null = null;
  let attemptNumber = 0;

  try {
    return await backOff(operation, {
      numOfAttempts: maxAttempts,
      startingDelay: 1000, // 1 second
      timeMultiple: 2, // Exponential: 1s, 2s, 4s
      maxDelay: 5000, // Cap at 5 seconds
      jitter: "full", // Full jitter to prevent thundering herd
      retry: (error: Error, currentAttempt: number) => {
        // Update closure state
        lastError = error;
        attemptNumber = currentAttempt;

        // Log retry attempt to Sentry as warning
        Sentry.captureMessage(
          `Retry attempt ${currentAttempt}/${maxAttempts} for ${operationName}`,
          {
            level: "warning",
            tags: {
              operationName,
              attemptNumber: String(currentAttempt),
              maxAttempts: String(maxAttempts),
            },
            extra: {
              errorMessage: error.message,
              errorStack: error.stack,
            },
          }
        );

        // Check if we should retry this specific error
        if (!shouldRetry(error)) {
          return false; // Stop retrying
        }

        return true; // Continue retrying
      },
    });
  } catch (error) {
    // All retry attempts exhausted - throw RetryError
    const retryError = new RetryError(
      `Operation '${operationName}' failed after ${maxAttempts} attempts`,
      lastError ?? (error instanceof Error ? error : new Error(String(error))),
      maxAttempts
    );

    // Capture retry exhaustion to Sentry with error level
    Sentry.captureException(retryError, {
      level: "error",
      tags: {
        operationName,
        retryExhausted: "true",
        maxAttempts: String(maxAttempts),
      },
      extra: {
        lastErrorMessage: retryError.lastError.message,
        lastErrorStack: retryError.lastError.stack,
      },
    });

    throw retryError;
  }
}
