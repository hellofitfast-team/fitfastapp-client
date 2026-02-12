---
phase: 04-hardening-service-layer
plan: 01
subsystem: ai
tags: [openrouter, deepseek, zod, sentry, retry-logic, validation, error-handling]

# Dependency graph
requires:
  - phase: 03-hardening-foundation
    provides: withRetry helper, AIGenerationError, ValidationError, validateMealPlanResponse, validateWorkoutPlanResponse
provides:
  - OpenRouter client with automatic retry (3 attempts, exponential backoff)
  - 30-second timeout on all OpenRouter API requests
  - Zod validation for all AI-generated meal and workout plans
  - Sentry error logging with context (userId, planDuration, language) for AI failures
affects: [05-hardening-api-routes, check-in-flow, plan-generation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wrap all AI API calls with withRetry for automatic resilience"
    - "Replace bare JSON.parse with Zod validation helpers in AI generators"
    - "Use AIGenerationError for all AI service failures (not generic Error)"
    - "Log all AI errors to Sentry with feature tags and user context"

key-files:
  created: []
  modified:
    - src/lib/ai/openrouter.ts
    - src/lib/ai/meal-plan-generator.ts
    - src/lib/ai/workout-plan-generator.ts

key-decisions:
  - "Skip retry on 4xx client errors (400, 401, 403, 422) - these are not transient failures"
  - "Retry on 5xx server errors and network failures - these may succeed on retry"
  - "30-second timeout prevents indefinite hangs on slow API responses"
  - "Wrap ValidationError in AIGenerationError for consistent error type upstream"

patterns-established:
  - "Pattern 1: All AI API calls go through withRetry with shouldRetry predicate"
  - "Pattern 2: AbortController with setTimeout for request timeouts (no external libraries)"
  - "Pattern 3: Zod validation helpers replace bare JSON.parse in all AI generators"
  - "Pattern 4: Sentry.captureException includes feature tag, userId, planDuration, language for AI errors"

# Metrics
duration: 3min
completed: 2026-02-12
---

# Phase 04 Plan 01: AI Service Layer Hardening Summary

**OpenRouter client hardened with retry logic (3 attempts, exponential backoff), 30s timeout, and Zod validation for all AI-generated meal/workout plans**

## Performance

- **Duration:** 3m 6s
- **Started:** 2026-02-12T21:25:16Z
- **Completed:** 2026-02-12T21:28:22Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- OpenRouter API calls automatically retry up to 3 times with exponential backoff (1s, 2s, 4s) on server/network errors
- All OpenRouter requests abort after 30 seconds if no response received (prevents indefinite hangs)
- AI-generated meal plans validated against Zod schema before returning (catches invalid JSON structure)
- AI-generated workout plans validated against Zod schema before returning (catches invalid JSON structure)
- All AI errors logged to Sentry with rich context (userId, planDuration, language, feature tag)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wrap OpenRouter client with retry and timeout** - `b4a8348` (feat)
2. **Task 2: Harden meal plan generator with Zod validation and Sentry logging** - `31e6515` (feat)
3. **Task 3: Harden workout plan generator with Zod validation and Sentry logging** - `eca0850` (feat)

## Files Created/Modified
- `src/lib/ai/openrouter.ts` - Added withRetry wrapper (3 attempts), AbortController timeout (30s), AIGenerationError, shouldRetry predicate skips 4xx
- `src/lib/ai/meal-plan-generator.ts` - Replaced JSON.parse with validateMealPlanResponse, added Sentry error logging with context, wrapped ValidationError in AIGenerationError
- `src/lib/ai/workout-plan-generator.ts` - Replaced JSON.parse with validateWorkoutPlanResponse, added Sentry error logging with context, wrapped ValidationError in AIGenerationError

## Decisions Made

1. **Skip retry on 4xx client errors** - 400, 401, 403, 422 indicate client mistakes (bad prompt, invalid API key, etc.) that retrying won't fix
2. **Retry on 5xx and network errors** - Server errors and network failures are transient and may succeed on retry
3. **30-second timeout** - Prevents indefinite hangs on slow API responses without being too aggressive for large plan generation
4. **Wrap ValidationError in AIGenerationError** - Provides consistent error type upstream for easier error handling in API routes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all Phase 3 infrastructure (withRetry, AIGenerationError, validateMealPlanResponse, validateWorkoutPlanResponse) worked as expected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- AI service layer is now resilient to transient failures (network hiccups, server errors)
- Invalid AI output caught before database save (prevents corrupt data)
- All AI errors logged to Sentry with context for monitoring and debugging
- Ready for Phase 04-02: API route hardening (check-in submission, plan generation endpoints)

## Self-Check: PASSED

All files exist:
- FOUND: src/lib/ai/openrouter.ts
- FOUND: src/lib/ai/meal-plan-generator.ts
- FOUND: src/lib/ai/workout-plan-generator.ts

All commits exist:
- FOUND: b4a8348
- FOUND: 31e6515
- FOUND: eca0850
