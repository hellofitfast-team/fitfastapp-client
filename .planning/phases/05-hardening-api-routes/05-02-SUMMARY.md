---
phase: 05-hardening-api-routes
plan: 02
subsystem: api-routes
tags: [validation, security, zod, sentry, error-handling]
completed: 2026-02-13

dependency-graph:
  requires:
    - 05-01 (API validation infrastructure)
  provides:
    - Validated plan generation endpoints (meal/workout)
    - Validated ticket creation endpoint
    - Validated auth endpoints (sign-in)
    - Sentry error tracking in all 6 routes
  affects:
    - User-facing plan generation flows
    - Support ticket creation
    - Authentication flows

tech-stack:
  added: []
  patterns:
    - Input validation before service layer
    - Sentry error tracking with feature tags
    - Warning-level logging for expected failures

key-files:
  created: []
  modified:
    - src/app/api/plans/meal/route.ts
    - src/app/api/plans/workout/route.ts
    - src/app/api/tickets/route.ts
    - src/app/api/auth/sign-in/route.ts
    - src/app/api/auth/profile/route.ts
    - src/app/api/auth/logout/route.ts
    - src/lib/api-validation/tickets.ts

decisions:
  - desc: "Fixed CreateTicketSchema categories to match database constraints"
    rationale: "Schema had ['plan', 'payment', 'technical', 'bug_report'] but DB expects ['meal_issue', 'workout_issue', 'technical', 'bug_report', 'other']"
    impact: "Prevents validation failures on ticket creation"

metrics:
  tasks: 2
  duration: 283s
  commits: 2
  files: 7
---

# Phase 05 Plan 02: Apply Validation to Plan, Ticket, and Auth Routes Summary

**One-liner:** Applied Zod validation to 4 POST routes (meal/workout plans, tickets, sign-in) and replaced all console.error with Sentry logging across 6 API routes.

## What Was Built

Hardened 6 core API routes with input validation and structured error logging:

### Plan Generation Routes
**Files:** `src/app/api/plans/meal/route.ts`, `src/app/api/plans/workout/route.ts`

**Changes:**
- Added `validateRequestBody` with `GeneratePlanSchema` to validate request bodies
- Validates `checkInId` (optional UUID) and `planDuration` (7-30 days)
- Early return on validation failure with 400 response
- Already had Sentry error tracking from Phase 4 (no changes needed)

**Flow:**
1. Parse request body
2. Validate with schema → return 400 if invalid
3. Continue with validated, typed data
4. Catch block already uses Sentry for errors

### Ticket Routes
**File:** `src/app/api/tickets/route.ts`

**Changes:**
- Added `validateRequestBody` with `CreateTicketSchema` to POST handler
- Replaced manual `if (!subject || !category)` check with Zod validation
- Replaced 4 `console.error` calls with `Sentry.captureException` in both GET and POST
- Fixed schema bug: Updated ticket categories to match database constraints

**Before:**
```typescript
if (!subject || !category) {
  return NextResponse.json({ error: "..." }, { status: 400 });
}
console.error("Error fetching tickets:", ticketsError);
```

**After:**
```typescript
const validation = validateRequestBody(body, CreateTicketSchema, {
  userId: user.id,
  feature: "ticket-creation",
});
if (!validation.success) return validation.response;
const { subject, category, description, screenshot_url } = validation.data;

Sentry.captureException(ticketsError, {
  tags: { feature: "tickets" },
  extra: { userId: user.id, action: "fetch-tickets" },
});
```

### Auth Routes
**Files:** `src/app/api/auth/sign-in/route.ts`, `profile/route.ts`, `logout/route.ts`

**Changes:**

**sign-in/route.ts:**
- Added `validateRequestBody` with `SignInSchema` to validate email/locale
- Replaced manual `if (!email)` check with Zod validation
- Replaced 2 `console.error` calls with `Sentry.captureException`
- Used `level: "warning"` for Supabase auth errors (expected for bad emails)

**profile/route.ts:**
- Added `* as Sentry` import
- Replaced `console.error` with `Sentry.captureException`
- Added `userId` tracking variable for error context

**logout/route.ts:**
- Added `* as Sentry` import
- Replaced `console.error` with `Sentry.captureException`
- No validation needed (POST with no body)

## How It Works

**Validation Pattern:**
```typescript
const body = await request.json();
const validation = validateRequestBody(body, Schema, {
  userId: user.id,  // Optional: for error tracking
  feature: "feature-name",
});
if (!validation.success) return validation.response;  // 400 with field errors
const { field1, field2 } = validation.data;  // Fully typed data
```

**Error Logging Pattern:**
```typescript
Sentry.captureException(error, {
  level: "error",  // or "warning" for expected failures
  tags: { feature: "feature-name" },
  extra: { userId, action: "action-name" },
});
```

**Benefits:**
- Type-safe request body access (no `any` types)
- Field-level error messages for clients
- Automatic Sentry logging on validation failures (via validateRequestBody)
- Structured error tracking with feature tags and user context
- No silent failures (all errors captured)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed CreateTicketSchema category mismatch**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** Schema defined categories as `['plan', 'payment', 'technical', 'bug_report']` but database constraint expects `['meal_issue', 'workout_issue', 'technical', 'bug_report', 'other']`
- **Fix:** Updated `src/lib/api-validation/tickets.ts` to match database enum
- **Files modified:** `src/lib/api-validation/tickets.ts`
- **Commit:** 14eeb8c (included in Task 1 commit)
- **Impact:** Prevents validation failures and TypeScript errors when creating tickets

## Integration Points

**Upstream:**
- Depends on 05-01 (validateRequestBody helper and all Zod schemas)
- Uses existing Sentry integration from Phase 3

**Downstream:**
- Plans 05-03 and 05-04 will apply same patterns to remaining routes
- Validation failures now logged to Sentry for monitoring

**Error Tracking:**
- Validation failures logged with `level: "warning"` and tagged with feature name
- Service errors logged with `level: "error"`
- User context attached (userId, email where available)
- Action tags for filtering by endpoint operation

## Testing Notes

**Verification Passed:**
- TypeScript compilation: 0 errors (excluding pre-existing Next.js types issue)
- Zero `console.error` calls in all 6 modified files
- 8 total uses of `validateRequestBody` across 4 routes (import + usage in each)
- All Sentry imports present in all files

**Manual Testing Needed:**
- Submit invalid plan generation request (missing checkInId, invalid planDuration)
- Submit invalid ticket (missing subject, invalid category)
- Submit invalid sign-in (missing email, invalid locale)
- Verify 400 responses with field-level errors
- Verify Sentry events captured for validation failures

## Next Steps

**Immediate (Plan 05-03):**
- Apply validation to notification routes (push subscriptions, reminders)
- Replace console.error with Sentry in notification handlers

**Subsequent (Plan 05-04):**
- Apply validation to admin routes (OCR, approve-signup, send-notification)
- Replace console.error with Sentry in admin handlers

**Future:**
- Monitor Sentry for validation failure patterns
- Adjust schema constraints based on real-world invalid inputs
- Add rate limiting to prevent validation abuse

## Self-Check: PASSED

**Modified files verified:**
```
FOUND: src/app/api/plans/meal/route.ts
FOUND: src/app/api/plans/workout/route.ts
FOUND: src/app/api/tickets/route.ts
FOUND: src/app/api/auth/sign-in/route.ts
FOUND: src/app/api/auth/profile/route.ts
FOUND: src/app/api/auth/logout/route.ts
FOUND: src/lib/api-validation/tickets.ts
```

**Commits verified:**
```
FOUND: 14eeb8c (Task 1 - plan and ticket routes)
FOUND: e4e68ae (Task 2 - auth routes)
```

**Validation usage:**
```
validateRequestBody in meal/route.ts: 2 occurrences (import + usage)
validateRequestBody in workout/route.ts: 2 occurrences (import + usage)
validateRequestBody in tickets/route.ts: 2 occurrences (import + usage)
validateRequestBody in sign-in/route.ts: 2 occurrences (import + usage)
Total: 8 occurrences
```

**Console.error cleanup:**
```
console.error in all 6 files: 0 occurrences
All replaced with Sentry.captureException
```

**TypeScript errors:**
```
Errors excluding Next.js types: 0
CreateTicketSchema bug fixed
```

All deliverables confirmed on disk and in git history.
