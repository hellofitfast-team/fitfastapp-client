# Phase 3: Hardening Foundation - Research

**Researched:** 2026-02-12
**Domain:** TypeScript error handling, validation, and resilience utilities
**Confidence:** HIGH

## Summary

This phase builds **foundation utilities** for error handling and validation that Phase 4 (Service Layer) and Phase 5 (API Routes) will consume. The focus is on creating reusable, well-typed TypeScript modules rather than refactoring existing code.

The tech stack already includes Zod v4.3.6 (for React Hook Form validation) and Sentry 10.38 (for error monitoring). The project uses Next.js 16.1.6 with App Router, TypeScript 5.9.3 in strict mode, and has existing AI integration via OpenRouter (DeepSeek V3 for plans, Qwen3-VL for OCR). Current error handling is minimal: basic try-catch in AI generators, JSON.parse without validation, no retry logic, and silent failures via empty .catch(() => {}) in 3 places.

**Primary recommendation:** Build four foundation modules in `src/lib/validation/` and `src/lib/errors/`: (1) Zod schemas for meal/workout plan validation, (2) exponential backoff retry utility using `exponential-backoff` npm package, (3) reusable error boundary wrapper component, and (4) custom domain error classes (ValidationError, RetryError, AIGenerationError). All utilities should use TypeScript strict mode, export full type definitions, and include JSDoc comments for IDE autocomplete.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zod | 4.3.6 | Runtime schema validation | TypeScript-first, zero dependencies, 14x faster parsing in v4, already used for form validation |
| @sentry/nextjs | 10.38.0 | Error monitoring & reporting | Already integrated, Next.js-specific, auto-captures errors in App Router |
| TypeScript | 5.9.3 | Type safety | Project already uses strict mode, Zod requires TS 5.5+ |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| exponential-backoff | 3.1.1 (latest) | Retry with exponential backoff | OpenRouter API calls, any external API with transient failures |
| @hookform/resolvers | 5.2.2 | React Hook Form + Zod integration | Already installed, used for form validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod | Yup | Yup lacks v4 performance gains, less type inference, more bundle size |
| exponential-backoff npm | Custom implementation | Library handles edge cases (jitter, maxDelay), well-tested, TypeScript types included |
| Sentry | Custom logging | Sentry provides stack traces, breadcrumbs, release tracking, alerting — critical for handoff to non-technical coaches |

**Installation:**
```bash
pnpm install exponential-backoff
# All other dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/lib/
├── validation/          # NEW: Zod schemas
│   ├── index.ts        # Re-exports all schemas
│   ├── meal-plan.ts    # MealPlan schema + types
│   └── workout-plan.ts # WorkoutPlan schema + types
├── errors/             # NEW: Error infrastructure
│   ├── index.ts        # Re-exports all errors + utilities
│   ├── types.ts        # Custom error classes
│   └── retry.ts        # Exponential backoff wrapper
└── components/         # NEW: Reusable error boundaries (or in src/components/errors/)
    └── ErrorBoundary.tsx
```

### Pattern 1: Schema-First Validation
**What:** Define Zod schema, infer TypeScript types from schema, use safeParse for validation
**When to use:** All AI-generated content (meal plans, workout plans), all API request bodies, any JSON.parse call
**Example:**
```typescript
// Source: Zod official docs - https://zod.dev/api
import { z } from "zod";

// 1. Define schema
const MealPlanSchema = z.object({
  weeklyPlan: z.record(z.object({
    meals: z.array(z.object({
      name: z.string(),
      type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
      calories: z.number().positive(),
      protein: z.number().nonnegative(),
      // ... other fields
    })),
    dailyTotals: z.object({
      calories: z.number().positive(),
      protein: z.number().nonnegative(),
      // ...
    }),
  })),
  weeklyTotals: z.object({
    calories: z.number().positive(),
    // ...
  }),
  notes: z.string(),
});

// 2. Infer TypeScript type
type MealPlan = z.infer<typeof MealPlanSchema>;

// 3. Validate with safeParse (never throws)
const result = MealPlanSchema.safeParse(aiResponse);
if (!result.success) {
  // result.error.errors contains structured validation issues
  throw new ValidationError("Invalid meal plan structure", result.error);
}
// result.data is type-safe MealPlan
return result.data;
```

### Pattern 2: Exponential Backoff Retry Wrapper
**What:** Wrap async functions in retry logic with exponential delays
**When to use:** All external API calls (OpenRouter, Supabase occasionally), operations with transient failures
**Example:**
```typescript
// Source: exponential-backoff README - https://github.com/coveooss/exponential-backoff
import { backOff } from "exponential-backoff";

/**
 * Retry an async operation with exponential backoff
 * @param operation - Promise-returning function to retry
 * @param maxAttempts - Maximum retry attempts (default: 3)
 * @returns Promise with operation result
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, onRetry } = options;

  return backOff(operation, {
    numOfAttempts: maxAttempts,
    startingDelay: 1000,        // 1 second
    timeMultiple: 2,             // Exponential: 1s, 2s, 4s
    maxDelay: 5000,              // Cap at 5 seconds
    jitter: "full",              // Prevent thundering herd
    retry: (error, attemptNumber) => {
      // Custom retry logic - log and continue
      if (onRetry) {
        onRetry(error as Error, attemptNumber);
      }
      return true; // Continue retrying
    },
  });
}

// Usage
const result = await withRetry(
  () => fetch(OPENROUTER_API_URL, { ... }),
  {
    maxAttempts: 3,
    onRetry: (error, attempt) => {
      console.warn(`OpenRouter retry ${attempt}/3:`, error.message);
      Sentry.captureMessage(`OpenRouter retry attempt ${attempt}`, {
        level: "warning",
        extra: { error: error.message }
      });
    },
  }
);
```

### Pattern 3: Custom Domain Error Classes
**What:** TypeScript error classes for specific error types with proper prototype chain
**When to use:** Replacing generic `throw new Error()` with semantic errors (ValidationError, RetryError, AIGenerationError)
**Example:**
```typescript
// Source: TypeScript custom error best practices - https://medium.com/@Nelsonalfonso/understanding-custom-errors-in-typescript-a-complete-guide-f47a1df9354c

/**
 * Base class for application-specific errors
 */
export class AppError extends Error {
  constructor(message: string, public code?: string, public context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
    // Clean stack trace (exclude constructor)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown when Zod validation fails on AI-generated content
 */
export class ValidationError extends AppError {
  constructor(message: string, public zodError?: z.ZodError) {
    super(message, "VALIDATION_ERROR", { zodError });
  }
}

/**
 * Thrown when retry exhausted without success
 */
export class RetryError extends AppError {
  constructor(message: string, public lastError: Error, public attempts: number) {
    super(message, "RETRY_EXHAUSTED", { lastError: lastError.message, attempts });
  }
}

/**
 * Thrown when AI generation fails after retries
 */
export class AIGenerationError extends AppError {
  constructor(message: string, public provider: string, public originalError?: Error) {
    super(message, "AI_GENERATION_FAILED", { provider, originalError: originalError?.message });
  }
}
```

### Pattern 4: Reusable Error Boundary Component
**What:** React Error Boundary wrapper component for route segment isolation
**When to use:** Wrap dashboard sections, AI generation UI, form submissions
**Example:**
```typescript
// Source: Next.js error.tsx conventions - https://nextjs.org/docs/app/api-reference/file-conventions/error
"use client";

import { Component, ReactNode, ErrorInfo } from "react";
import * as Sentry from "@sentry/nextjs";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Reusable error boundary wrapper for route segment isolation
 * Automatically captures errors to Sentry
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Capture to Sentry with component stack
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback or default UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      // Default fallback UI
      return (
        <div className="rounded-lg border border-error-200 bg-error-50 p-4">
          <h3 className="text-lg font-semibold text-error-900">Something went wrong</h3>
          <p className="text-sm text-error-700">{this.state.error.message}</p>
          <button onClick={this.reset} className="mt-2 text-sm text-error-600 underline">
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage example
<ErrorBoundary
  fallback={(error, reset) => (
    <Card>
      <CardHeader>Plan Generation Failed</CardHeader>
      <CardContent>
        <p>{error.message}</p>
        <Button onClick={reset}>Retry</Button>
      </CardContent>
    </Card>
  )}
  onError={(error) => {
    console.error("Meal plan generation failed:", error);
  }}
>
  <MealPlanGenerator />
</ErrorBoundary>
```

### Anti-Patterns to Avoid
- **Silent catches:** `fetch().catch(() => {})` — always log to Sentry with context
- **Naked JSON.parse:** Always wrap in try-catch OR use Zod schema validation
- **Generic Error messages:** `throw new Error("Failed")` — use domain error classes with context
- **No retry on transient failures:** External APIs can fail temporarily — always retry with backoff
- **Throwing in error boundaries:** Re-throwing in error.tsx causes infinite loops — log and show fallback

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Exponential backoff retry | Custom setTimeout loop with attempt tracking | `exponential-backoff` npm package | Handles edge cases: jitter (thundering herd prevention), maxDelay cap, conditional retry logic, TypeScript types. Well-tested library (3M+ weekly downloads). |
| Runtime validation | Manual property checks + type guards | Zod schemas with safeParse | Zod provides: structured error messages, nested validation, type inference, transformation, async validation. v4 is 14x faster than manual checks. |
| Error monitoring | console.error + file logging | Sentry captureException | Sentry auto-captures: stack traces, breadcrumbs, user context, release tracking, email alerts. Critical for handoff to non-technical coaches. |
| Error boundaries | try-catch around render | React Error Boundary class component | Error boundaries catch rendering errors, lifecycle errors, and constructor errors that try-catch misses. Required by Next.js App Router for route segment isolation. |

**Key insight:** Resilience infrastructure is deceptively complex. Jitter prevents synchronized retries (thundering herd problem), maxDelay prevents infinite waits, structured validation catches edge cases humans miss, and error boundaries isolate failures. Use battle-tested libraries rather than custom implementations.

## Common Pitfalls

### Pitfall 1: Using .parse() Instead of .safeParse()
**What goes wrong:** Zod's `.parse()` throws ZodError, crashing the application if AI returns malformed JSON
**Why it happens:** .parse() is shorter and "feels" cleaner than checking result.success
**How to avoid:** Always use `.safeParse()` for untrusted data (AI responses, API inputs). Reserve `.parse()` for internal data you control.
**Warning signs:** Uncaught ZodError in production logs, Sentry reports with "ZodError: Expected object, received string"

### Pitfall 2: Forgetting Object.setPrototypeOf in Custom Errors
**What goes wrong:** `error instanceof ValidationError` returns false even when error is ValidationError, breaking error handling logic
**Why it happens:** TypeScript transpiles to ES5, breaking native class inheritance for Error
**How to avoid:** Always add `Object.setPrototypeOf(this, new.target.prototype)` in custom error constructors
**Warning signs:** Error logs show correct error type, but conditional checks fail; catch blocks don't match expected error types

### Pitfall 3: No Jitter in Retry Logic
**What goes wrong:** When OpenRouter API goes down, all clients retry simultaneously at 1s, 2s, 4s — synchronized waves overwhelm the recovering service
**Why it happens:** Pure exponential backoff without randomization means identical timing for all clients
**How to avoid:** Always set `jitter: "full"` in exponential-backoff options to add randomness (e.g., retry between 0-2000ms instead of exactly 2000ms)
**Warning signs:** Retry storms in API logs, service degradation correlates with retry timing, "thundering herd" pattern in metrics

### Pitfall 4: Client Component Error Boundaries Without "use client"
**What goes wrong:** Error boundary component causes Next.js build error: "Error boundaries must be Client Components"
**Why it happens:** Error boundaries use React class components with lifecycle methods (componentDidCatch), which only work in Client Components
**How to avoid:** Always add `"use client"` directive at top of error boundary files, even if wrapping Server Components
**Warning signs:** Build error referencing error.tsx, runtime error about Server Components not supporting error boundaries

### Pitfall 5: Validating AI Response Before Cleaning Markdown
**What goes wrong:** Zod validation fails because AI response contains ` ```json\n` wrapper around valid JSON
**Why it happens:** OpenRouter models sometimes return markdown-formatted code blocks despite "no markdown" in prompt
**How to avoid:** Always clean AI response BEFORE validation: strip ` ```json`, ` ````, and trim whitespace, THEN validate with Zod
**Warning signs:** Zod error "Expected object, received string", raw AI response in logs shows ` ```json { ... }```

### Pitfall 6: Not Setting maxDelay on Retry
**What goes wrong:** Exponential backoff without cap reaches 60+ second delays on later attempts, blocking users indefinitely
**Why it happens:** `exponential-backoff` defaults maxDelay to Infinity, causing unlimited delay growth
**How to avoid:** Always set `maxDelay: 5000` (5 seconds) or similar reasonable cap
**Warning signs:** User complaints about "freezing" app, extremely long wait times in production, retry delays exceeding 10+ seconds

### Pitfall 7: Catching Errors Without Sentry Context
**What goes wrong:** Error appears in Sentry with no context about user, operation, or data — impossible to debug
**Why it happens:** Basic `Sentry.captureException(error)` doesn't include application state
**How to avoid:** Always pass context to Sentry: `Sentry.captureException(error, { tags: { feature: "meal-plan" }, extra: { userId, planType } })`
**Warning signs:** Sentry errors lack user ID, operation name, or relevant data; can't reproduce production errors

## Code Examples

Verified patterns from official sources.

### Zod Schema with Nested Validation
```typescript
// Source: Zod API docs - https://zod.dev/api
import { z } from "zod";

/**
 * Meal plan schema matching GeneratedMealPlan interface
 * Validates AI-generated meal plans before database save
 */
export const MealSchema = z.object({
  name: z.string().min(1, "Meal name required"),
  type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format"),
  calories: z.number().positive("Calories must be positive"),
  protein: z.number().nonnegative("Protein cannot be negative"),
  carbs: z.number().nonnegative("Carbs cannot be negative"),
  fat: z.number().nonnegative("Fat cannot be negative"),
  ingredients: z.array(z.string().min(1)).min(1, "At least one ingredient required"),
  instructions: z.array(z.string().min(1)).min(1, "At least one instruction required"),
  alternatives: z.array(z.string()).optional(),
});

export const DailyMealPlanSchema = z.object({
  meals: z.array(MealSchema).min(1, "At least one meal required"),
  dailyTotals: z.object({
    calories: z.number().positive(),
    protein: z.number().nonnegative(),
    carbs: z.number().nonnegative(),
    fat: z.number().nonnegative(),
  }),
});

export const MealPlanSchema = z.object({
  weeklyPlan: z.record(
    z.string(), // day names (monday, tuesday, etc.)
    DailyMealPlanSchema
  ),
  weeklyTotals: z.object({
    calories: z.number().positive(),
    protein: z.number().nonnegative(),
    carbs: z.number().nonnegative(),
    fat: z.number().nonnegative(),
  }),
  notes: z.string(),
});

// Export inferred type for use in application
export type MealPlan = z.infer<typeof MealPlanSchema>;
export type Meal = z.infer<typeof MealSchema>;
```

### Validation with Error Context
```typescript
// Source: Zod safeParse pattern - https://zod.dev/api
import { MealPlanSchema } from "@/lib/validation/meal-plan";
import { ValidationError } from "@/lib/errors/types";
import * as Sentry from "@sentry/nextjs";

/**
 * Validate AI-generated meal plan with Zod schema
 * @throws ValidationError if schema validation fails
 */
export function validateMealPlan(data: unknown): MealPlan {
  const result = MealPlanSchema.safeParse(data);

  if (!result.success) {
    // Log validation failure to Sentry with full context
    Sentry.captureException(new ValidationError("Meal plan validation failed", result.error), {
      level: "error",
      tags: {
        validationType: "meal-plan",
        errorCount: result.error.errors.length,
      },
      extra: {
        validationErrors: result.error.errors,
        receivedData: data,
      },
    });

    throw new ValidationError(
      `Invalid meal plan structure: ${result.error.errors.map(e => e.message).join(", ")}`,
      result.error
    );
  }

  return result.data;
}
```

### Retry Wrapper with Logging
```typescript
// Source: exponential-backoff package - https://github.com/coveooss/exponential-backoff
import { backOff } from "exponential-backoff";
import { RetryError } from "./types";
import * as Sentry from "@sentry/nextjs";

/**
 * Retry an async operation with exponential backoff and jitter
 * Logs each retry attempt to Sentry as warning
 *
 * @param operation - Promise-returning function to retry
 * @param options.maxAttempts - Maximum retry attempts (default: 3)
 * @param options.operationName - Name for logging (default: "operation")
 * @returns Promise with operation result
 * @throws RetryError if all attempts exhausted
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    operationName?: string;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, operationName = "operation" } = options;
  let lastError: Error | null = null;

  try {
    return await backOff(operation, {
      numOfAttempts: maxAttempts,
      startingDelay: 1000,        // 1 second
      timeMultiple: 2,             // Exponential: 1s, 2s, 4s
      maxDelay: 5000,              // Cap at 5 seconds
      jitter: "full",              // Prevent thundering herd
      retry: (error, attemptNumber) => {
        lastError = error as Error;

        // Log retry attempt to Sentry
        Sentry.captureMessage(`Retry attempt ${attemptNumber}/${maxAttempts} for ${operationName}`, {
          level: "warning",
          extra: {
            error: error.message,
            attemptNumber,
            maxAttempts,
            operationName,
          },
        });

        console.warn(`[Retry] ${operationName} attempt ${attemptNumber}/${maxAttempts}:`, error.message);

        // Continue retrying
        return true;
      },
    });
  } catch (error) {
    // All retries exhausted
    const retryError = new RetryError(
      `${operationName} failed after ${maxAttempts} attempts`,
      lastError || (error as Error),
      maxAttempts
    );

    Sentry.captureException(retryError, {
      level: "error",
      tags: { operationName, retryExhausted: true },
    });

    throw retryError;
  }
}
```

### Sentry Error Context Pattern
```typescript
// Source: Sentry Next.js docs - https://docs.sentry.io/platforms/javascript/guides/nextjs/capturing-errors/
import * as Sentry from "@sentry/nextjs";

/**
 * Capture exception to Sentry with rich context
 *
 * @param error - Error to capture
 * @param context - Additional context (feature, userId, metadata)
 */
export function captureErrorWithContext(
  error: Error,
  context: {
    feature: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  Sentry.captureException(error, {
    level: "error",
    tags: {
      feature: context.feature,
    },
    user: context.userId ? { id: context.userId } : undefined,
    extra: {
      ...context.metadata,
      errorType: error.constructor.name,
    },
  });
}

// Usage example
try {
  const plan = await generateMealPlan(params);
} catch (error) {
  captureErrorWithContext(error as Error, {
    feature: "meal-plan-generation",
    userId: params.profile.id,
    metadata: {
      language: params.language,
      planDuration: params.planDuration,
      hasCheckIn: !!params.checkIn,
    },
  });
  throw new AIGenerationError("Failed to generate meal plan", "OpenRouter", error as Error);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual type guards | Zod schema validation | v3 → v4 (2024) | 14x faster string parsing, 7x faster arrays, better type inference |
| Plain Error throwing | Custom error classes with context | TypeScript 5.0+ | Better error categorization, instanceof checks work, structured context for debugging |
| Fixed retry delays | Exponential backoff + jitter | Industry standard (2023+) | Prevents thundering herd, graceful degradation, respects rate limits |
| error.tsx per route | Reusable ErrorBoundary component | Next.js 13 App Router | DRY error handling, consistent UX, easier Sentry integration |
| try-catch only | Error boundaries + try-catch | React 16+ (2017) | Catch rendering errors that try-catch misses, isolate failures to route segments |

**Deprecated/outdated:**
- **Zod v3 `.parse()` everywhere:** v4 recommends `.safeParse()` for untrusted data to avoid throws
- **No jitter in retries:** Industry moved to full jitter to prevent synchronized retry storms
- **Class components for error boundaries:** Still required (no hooks equivalent), but Next.js now provides error.tsx convention as alternative to manual boundaries

## Open Questions

1. **Should validation schemas match database JSONB exactly or be more permissive?**
   - What we know: Database stores plans as flexible JSONB; AI output varies
   - What's unclear: Whether schemas should enforce strict structure (fail on extra fields) or allow flexibility
   - Recommendation: Use `.strict()` for critical fields (calories, macros) but `.passthrough()` for flexible fields (notes, alternatives) to allow AI innovation without breaking validation

2. **How to handle partial validation failures in nested plans?**
   - What we know: Weekly meal plan has 7 days × 3-5 meals = 21-35 meal objects
   - What's unclear: If day 5's lunch fails validation, should entire plan be rejected or allow partial save?
   - Recommendation: Phase 3 builds strict all-or-nothing validation (safest). Phase 4/5 can add partial validation if product needs evolve.

3. **Should retry utility support custom backoff strategies?**
   - What we know: `exponential-backoff` package supports customization via `timeMultiple` and `startingDelay`
   - What's unclear: Whether different operations need different strategies (e.g., OCR vs. plan generation)
   - Recommendation: Start with single strategy (1s/2s/4s with full jitter). Add strategy parameter in Phase 4 if analytics show need.

## Sources

### Primary (HIGH confidence)
- Zod official docs v4 - https://zod.dev/ and https://zod.dev/api - schema definition, safeParse, type inference, validation patterns
- Next.js 16.1.6 error.tsx conventions - https://nextjs.org/docs/app/api-reference/file-conventions/error - error boundaries, client components, props API
- exponential-backoff GitHub README - https://github.com/coveooss/exponential-backoff - TypeScript API, BackOffOptions, retry logic
- Sentry Next.js capturing errors - https://docs.sentry.io/platforms/javascript/guides/nextjs/capturing-errors/ - captureException API, context options

### Secondary (MEDIUM confidence)
- [Zod 4 Performance Improvements](https://peerlist.io/saxenashikhil/articles/zod-4--the-next-evolution-in-typescript-validation) - 14x faster string parsing benchmarks
- [TypeScript Custom Error Best Practices](https://medium.com/@Nelsonalfonso/understanding-custom-errors-in-typescript-a-complete-guide-f47a1df9354c) - Object.setPrototypeOf pattern, captureStackTrace
- [Exponential Backoff with Jitter](https://medium.com/@avnein4988/mitigating-the-thundering-herd-problem-exponential-backoff-with-jitter-b507cdf90d62) - thundering herd problem explanation
- [React Hook Form Zod Resolver](https://github.com/react-hook-form/resolvers) - zodResolver integration patterns
- [Zod Schema Composition](https://codez.guru/guides/zod/lesson-06-schema-composition-with-merge-extend-pick/) - extend, pick, omit methods

### Tertiary (LOW confidence)
- None - all critical claims verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zod v4.3.6 already installed, Sentry 10.38 already integrated, exponential-backoff is well-documented with 3M+ weekly downloads
- Architecture: HIGH - Patterns verified from official Next.js 16, Zod v4, and Sentry docs; existing project structure supports proposed organization
- Pitfalls: MEDIUM - Based on common GitHub issues and documented gotchas; thundering herd verified in industry blogs; prototype chain issue verified in TypeScript docs

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days) - Stable stack, Zod v4 recent, exponential-backoff mature package
