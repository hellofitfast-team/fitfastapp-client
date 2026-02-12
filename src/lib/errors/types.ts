import type { ZodError } from "zod";

/**
 * Base application error class.
 *
 * All custom errors extend this class to ensure proper instanceof checks
 * and consistent error structure across the application.
 *
 * Use this for general application errors that don't fit specific categories.
 * Phase 4/5 consumers should prefer more specific error types (ValidationError,
 * AIGenerationError, etc.) when available.
 *
 * @example
 * ```typescript
 * throw new AppError("Something went wrong", "GENERIC_ERROR", { userId: 123 });
 * ```
 */
export class AppError extends Error {
  public readonly code?: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code?: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;

    // Maintains proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace (V8-only, safe to use in Node.js/browsers)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown when input validation fails (e.g., Zod schema validation).
 *
 * Phase 4/5 consumers should wrap all user input validation and JSON.parse
 * operations with try-catch blocks that throw this error type.
 *
 * The `issues` getter provides easy access to Zod validation details for
 * displaying field-level errors to users.
 *
 * @example
 * ```typescript
 * try {
 *   const data = schema.parse(input);
 * } catch (error) {
 *   if (error instanceof ZodError) {
 *     throw new ValidationError("Invalid input", error);
 *   }
 * }
 * ```
 */
export class ValidationError extends AppError {
  public readonly zodError?: ZodError;

  constructor(message: string, zodError?: ZodError) {
    super(message, "VALIDATION_ERROR", {
      issueCount: zodError?.issues?.length ?? 0,
    });
    this.zodError = zodError;
  }

  /**
   * Provides easy access to Zod validation issues.
   * Returns empty array if no Zod error was provided.
   */
  get issues() {
    return this.zodError?.issues ?? [];
  }
}

/**
 * Thrown when all retry attempts are exhausted.
 *
 * Phase 4/5 consumers will receive this error when withRetry() fails after
 * all configured attempts. The lastError property contains the final error
 * that caused the retry to give up.
 *
 * This error is automatically thrown by withRetry() and logged to Sentry
 * with retry context.
 *
 * @example
 * ```typescript
 * try {
 *   await withRetry(() => fetchFromAPI(), { maxAttempts: 3 });
 * } catch (error) {
 *   if (error instanceof RetryError) {
 *     console.error(`Failed after ${error.attempts} attempts`);
 *     console.error(`Last error: ${error.lastError.message}`);
 *   }
 * }
 * ```
 */
export class RetryError extends AppError {
  public readonly lastError: Error;
  public readonly attempts: number;

  constructor(message: string, lastError: Error, attempts: number) {
    super(message, "RETRY_EXHAUSTED", {
      lastErrorMessage: lastError.message,
      attemptCount: attempts,
    });
    this.lastError = lastError;
    this.attempts = attempts;
  }
}

/**
 * Thrown when AI generation fails (OpenRouter, DeepSeek, Qwen3-VL, etc.).
 *
 * Phase 4/5 consumers should wrap all AI API calls with try-catch blocks
 * that throw this error type. The provider property helps track which
 * AI service failed for monitoring and debugging.
 *
 * When used with withRetry(), this error will be caught and retried
 * automatically before throwing a RetryError.
 *
 * @example
 * ```typescript
 * try {
 *   const response = await fetch(OPENROUTER_URL, { ... });
 *   if (!response.ok) {
 *     throw new AIGenerationError(
 *       "OpenRouter API request failed",
 *       "openrouter",
 *       new Error(`HTTP ${response.status}`)
 *     );
 *   }
 * } catch (error) {
 *   if (error instanceof AIGenerationError) {
 *     console.error(`${error.provider} failed: ${error.message}`);
 *   }
 * }
 * ```
 */
export class AIGenerationError extends AppError {
  public readonly provider: string;
  public readonly originalError?: Error;

  constructor(message: string, provider: string, originalError?: Error) {
    super(message, "AI_GENERATION_FAILED", {
      provider,
      originalErrorMessage: originalError?.message,
    });
    this.provider = provider;
    this.originalError = originalError;
  }
}
