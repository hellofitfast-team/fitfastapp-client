---
phase: 04-hardening-service-layer
plan: 02
subsystem: service-layer
tags: [refactoring, error-handling, sentry, queries]
dependency_graph:
  requires: [phase-04-research, error-infrastructure]
  provides: [query-layer, sentry-integration]
  affects: [meal-plan-api, workout-plan-api]
tech_stack:
  added: [query-functions]
  patterns: [extracted-queries, centralized-error-handling]
key_files:
  created:
    - src/lib/supabase/queries/profiles.ts
    - src/lib/supabase/queries/assessments.ts
    - src/lib/supabase/queries/check-ins.ts
    - src/lib/supabase/queries/plans.ts
    - src/lib/supabase/queries/index.ts
  modified:
    - src/app/api/plans/meal/route.ts
    - src/app/api/plans/workout/route.ts
decisions: []
metrics:
  duration_seconds: 211
  tasks_completed: 2
  files_modified: 7
  completed_at: 2026-02-12T21:28:41Z
---

# Phase 04 Plan 02: Query Layer Extraction Summary

**One-liner:** Extracted duplicated Supabase queries into typed reusable functions with Sentry error logging and descriptive AppError codes

## What Was Built

Created a centralized query layer in `src/lib/supabase/queries/` with five typed query functions that eliminate code duplication across the meal and workout plan API routes. All queries now have consistent error handling with Sentry logging (feature tags + userId context) and throw descriptive AppError codes.

**Query functions:**
- `getProfileById` - Fetches profile by userId, throws PROFILE_NOT_FOUND
- `getAssessmentByUserId` - Fetches assessment by userId, throws ASSESSMENT_NOT_FOUND
- `getCheckInById` - Fetches check-in by id, returns null on failure (non-critical)
- `saveMealPlan` - Saves meal plan to DB, throws MEAL_PLAN_SAVE_FAILED
- `saveWorkoutPlan` - Saves workout plan to DB, throws WORKOUT_PLAN_SAVE_FAILED

**API route refactoring:**
- Replaced all inline `.from()` queries with extracted query functions
- Replaced `console.error` with `Sentry.captureException` with userId/action/timestamp context
- Added Sentry logging to OneSignal notification failures (not silently swallowed)
- Reduced code duplication by ~44 lines across both routes

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

**Supabase Type Workarounds Applied:**
- Used `as never` cast on insert payloads in `saveMealPlan` and `saveWorkoutPlan` per MEMORY.md pattern
- Used `.single<Type>()` on query results for proper type inference

**Error Handling Pattern:**
- Query functions throw AppError with descriptive codes (PROFILE_NOT_FOUND, etc.)
- All errors logged to Sentry with feature tags and context (userId, errorCode)
- Check-in queries return null instead of throwing (non-critical for plan generation)

**Sentry Integration:**
- All query functions log to Sentry with feature tags: `profile-query`, `assessment-query`, `check-in-query`, `meal-plan-save`, `workout-plan-save`
- API route catch blocks log to Sentry with feature tags: `meal-plan-generation`, `workout-plan-generation`
- Notification failures logged at warning level with `notification` feature tag

## Verification Results

All verification checks passed:
- TypeScript compilation: Zero new errors (only pre-existing .next/types error)
- Query extraction: Both routes use `getProfileById`, `getAssessmentByUserId`, `getCheckInById`
- No inline queries: Zero `.from("profiles")` or `.from("initial_assessments")` in route files
- No console.error: Zero `console.error` in route files
- Sentry logging: All catch blocks use `Sentry.captureException` with context

## Self-Check: PASSED

**Created files verified:**
```bash
✓ src/lib/supabase/queries/profiles.ts
✓ src/lib/supabase/queries/assessments.ts
✓ src/lib/supabase/queries/check-ins.ts
✓ src/lib/supabase/queries/plans.ts
✓ src/lib/supabase/queries/index.ts
```

**Commits verified:**
```bash
✓ 3713d62: feat(04-02): create extracted Supabase query functions
✓ f7e3d77: refactor(04-02): update plan API routes to use extracted queries and Sentry
```

**Pattern verification:**
```bash
✓ AppError imports present in all query files
✓ Sentry.captureException present in all query files and API routes
✓ 'as never' cast present in plans.ts (2 occurrences)
✓ Zero inline .from() queries in API routes
✓ Zero console.error in API routes
```

## Next Steps

Phase 5 (API Routes) can now build on this query layer. All future API routes should use these extracted query functions instead of inline Supabase queries for consistent error handling and maintainability.
