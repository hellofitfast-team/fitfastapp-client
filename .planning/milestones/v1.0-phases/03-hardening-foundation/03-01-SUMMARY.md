---
phase: 03-hardening-foundation
plan: 01
subsystem: error-infrastructure
tags: [error-handling, retry-logic, resilience, sentry]
dependency-graph:
  requires: []
  provides:
    - Custom error classes (AppError, ValidationError, RetryError, AIGenerationError)
    - Exponential backoff retry utility (withRetry)
    - Barrel exports from @/lib/errors
  affects:
    - Phase 4 (Service Layer) - will consume error classes
    - Phase 5 (API Routes) - will consume error classes
    - All future AI integration points
tech-stack:
  added:
    - exponential-backoff@3.1.3 (retry logic with jitter)
  patterns:
    - Object.setPrototypeOf for proper prototype chain
    - Full jitter exponential backoff (1s/2s/4s)
    - Sentry integration for retry monitoring
key-files:
  created:
    - src/lib/errors/types.ts (custom error classes)
    - src/lib/errors/retry.ts (withRetry utility)
    - src/lib/errors/index.ts (barrel exports)
  modified:
    - package.json (added exponential-backoff)
    - pnpm-lock.yaml (dependency resolution)
decisions: []
metrics:
  duration: 197s
  completed: 2026-02-12T16:45:48Z
---

# Phase 03 Plan 01: Error Infrastructure Foundation

**One-liner:** Custom error classes with proper prototype chain and exponential backoff retry utility (1s/2s/4s with full jitter) integrated with Sentry monitoring.

## What Was Built

Created foundational error handling infrastructure for Phase 4 (Service Layer) and Phase 5 (API Routes):

1. **Custom Error Classes** (`src/lib/errors/types.ts`):
   - **AppError**: Base class with code and context properties
   - **ValidationError**: Extends AppError, integrates with Zod, provides `issues` getter
   - **RetryError**: Thrown when withRetry exhausts all attempts, stores lastError and attempt count
   - **AIGenerationError**: For AI service failures, stores provider and originalError

   All classes use `Object.setPrototypeOf(this, new.target.prototype)` pattern for proper `instanceof` checks and `Error.captureStackTrace` (V8-only, safely guarded).

2. **Retry Utility** (`src/lib/errors/retry.ts`):
   - `withRetry<T>()` generic function wraps any async operation
   - Exponential backoff: 1s, 2s, 4s (timeMultiple: 2, startingDelay: 1000)
   - Full jitter prevents thundering herd (`jitter: "full"`)
   - Max delay capped at 5 seconds
   - Configurable `maxAttempts` (default: 3), `operationName`, and `shouldRetry` predicate
   - Logs each retry attempt to Sentry as warning with operation context
   - Throws `RetryError` when exhausted, captured to Sentry with error level and tags

3. **Barrel Exports** (`src/lib/errors/index.ts`):
   - Clean imports: `import { withRetry, RetryError } from "@/lib/errors"`
   - Re-exports all 4 error classes and withRetry utility

## Technical Implementation

**Error Class Pattern:**
```typescript
export class AppError extends Error {
  constructor(message: string, code?: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;

    // Maintains proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace (V8-only, safe to use)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
```

**Retry Utility Pattern:**
```typescript
export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    operationName?: string;
    shouldRetry?: (error: Error) => boolean;
  }
): Promise<T> {
  // Uses exponential-backoff's backOff() with:
  // - numOfAttempts: 3 (default)
  // - startingDelay: 1000ms
  // - timeMultiple: 2 (exponential)
  // - maxDelay: 5000ms
  // - jitter: "full"
  // - retry callback: logs to Sentry, checks shouldRetry
}
```

**Sentry Integration:**
- Warning level for each retry attempt (tags: operationName, attemptNumber, maxAttempts)
- Error level for exhausted retries (tags: operationName, retryExhausted: "true")
- Extra context includes error messages and stack traces

## Deviations from Plan

None - plan executed exactly as written.

## Usage Examples for Phase 4/5

**Wrapping AI API calls:**
```typescript
const response = await withRetry(
  async () => {
    const res = await fetch(OPENROUTER_URL, { ... });
    if (!res.ok) throw new AIGenerationError(
      "OpenRouter request failed",
      "openrouter",
      new Error(`HTTP ${res.status}`)
    );
    return res.json();
  },
  {
    operationName: "openrouter-generate-meal-plan",
    maxAttempts: 3,
    shouldRetry: (error) => {
      // Only retry server errors, not client errors
      return !(error instanceof AIGenerationError &&
               error.originalError?.message.includes("4"));
    }
  }
);
```

**Wrapping Supabase queries:**
```typescript
const profile = await withRetry(
  async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return data;
  },
  { operationName: "fetch-user-profile" }
);
```

**Handling validation:**
```typescript
try {
  const data = profileSchema.parse(input);
} catch (error) {
  if (error instanceof ZodError) {
    throw new ValidationError("Invalid profile data", error);
  }
}

// Consumer can access issues:
catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.issues); // Zod issue array
  }
}
```

## Testing Notes

- Pre-existing TypeScript errors in `src/app/[locale]/(dashboard)/workout-plan/page.tsx` (hover state issues, documented in MEMORY.md)
- These errors are unrelated to this plan's changes
- New error infrastructure has zero TypeScript errors
- All verification checks passed

## Next Steps

**Phase 4 (Service Layer)** will:
1. Create service modules that wrap AI calls and Supabase queries with `withRetry()`
2. Use custom error classes for domain-specific errors
3. Catch and re-throw errors with proper context for Sentry tracking

**Phase 5 (API Routes)** will:
1. Import error classes and retry utility from `@/lib/errors`
2. Wrap all external calls (OpenRouter, Supabase) with `withRetry()`
3. Return structured error responses based on error types
4. Log all errors to Sentry with request context

## Self-Check: PASSED

**Created files verified:**
```
FOUND: src/lib/errors/types.ts
FOUND: src/lib/errors/retry.ts
FOUND: src/lib/errors/index.ts
```

**Commits verified:**
```
FOUND: 0fe9303 (Task 1: Custom error classes)
FOUND: 9d0efa7 (Task 2: Retry utility and barrel exports)
```

**Dependency verified:**
```
FOUND: exponential-backoff in package.json
```

**Exports verified:**
- types.ts: AppError, ValidationError, RetryError, AIGenerationError ✓
- retry.ts: withRetry ✓
- index.ts: re-exports all 5 symbols ✓

**Implementation details verified:**
- Object.setPrototypeOf pattern used ✓
- backOff jitter: "full" ✓
- backOff maxDelay: 5000 ✓
