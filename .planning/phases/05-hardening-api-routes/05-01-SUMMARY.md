---
phase: 05-hardening-api-routes
plan: 01
subsystem: api-validation
tags: [validation, security, zod, sentry]
completed: 2026-02-13

dependency-graph:
  requires: []
  provides:
    - validateRequestBody helper for type-safe validation
    - Zod schemas for all 13 API route endpoints
    - Sentry integration for validation failure tracking
  affects:
    - All API routes (will be integrated in plans 02-04)

tech-stack:
  added:
    - zod: Input validation with TypeScript type inference
  patterns:
    - Discriminated union return type for validation results
    - Centralized validation schemas with barrel exports
    - Automatic Sentry logging on validation failures

key-files:
  created:
    - src/lib/api-validation/index.ts
    - src/lib/api-validation/plans.ts
    - src/lib/api-validation/tickets.ts
    - src/lib/api-validation/admin.ts
    - src/lib/api-validation/notifications.ts
    - src/lib/api-validation/auth.ts
  modified: []

decisions: []

metrics:
  tasks: 2
  duration: 92s
  commits: 2
  files: 6
---

# Phase 05 Plan 01: API Validation Infrastructure Summary

**One-liner:** Created reusable validateRequestBody helper and 10 Zod schemas covering all 13 API endpoints with automatic Sentry logging on validation failures.

## What Was Built

Created the foundation for API input validation:

1. **validateRequestBody Helper** (`src/lib/api-validation/index.ts`)
   - Generic function that validates request bodies against Zod schemas
   - Returns discriminated union: `{ success: true; data: T }` or `{ success: false; response: NextResponse }`
   - Automatically logs validation failures to Sentry with:
     - Warning level
     - Tags: `{ feature, validation: "request-body" }`
     - Extra data: `{ userId, errors, body }`
   - Returns 400 responses with field-level error details
   - Includes barrel exports for all schema modules

2. **Zod Validation Schemas** (5 files, 10 schemas total)
   - **plans.ts**: `GeneratePlanSchema` - validates check-in ID and plan duration (7-30 days)
   - **tickets.ts**: `CreateTicketSchema` - validates ticket creation with category, subject, description, screenshot URL
   - **admin.ts**:
     - `OcrRequestSchema` - validates OCR input (requires imageBase64 or imageUrl)
     - `OcrResultSchema` - validates AI OCR output before database save
     - `ApproveSignupSchema` - validates signup approval requests
     - `SendNotificationSchema` - validates notification broadcasts (requires user_ids or send_to_all)
   - **notifications.ts**:
     - `SubscriptionSchema` - validates push notification subscriptions
     - `UnsubscribeSchema` - validates unsubscribe requests
     - `ReminderTimeSchema` - validates time format (HH:MM)
   - **auth.ts**: `SignInSchema` - validates magic link sign-in with email and locale

All schemas include exported TypeScript types (e.g., `GeneratePlanInput`) for use in route handlers.

## How It Works

**Validation Flow:**
1. API route receives request
2. Calls `validateRequestBody(body, schema, { userId, feature })`
3. On success: returns `{ success: true, data }` with properly typed data
4. On failure: logs to Sentry and returns `{ success: false, response }` with 400 error

**Type Safety:**
- Schemas use `z.infer<typeof Schema>` to generate TypeScript types
- Route handlers get full autocomplete for validated request bodies
- Discriminated union ensures exhaustive handling of success/failure cases

**Database Alignment:**
- All string constraints match database column lengths
- UUID validation for foreign keys
- Enum validation for categorical fields
- Custom refinements for complex rules (e.g., "at least one field must be provided")

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

**Downstream:**
- Plans 05-02, 05-03, 05-04 will integrate these schemas into actual API routes
- All 13 API routes will use `validateRequestBody` for input validation

**Sentry:**
- Validation failures logged with structured context
- Enables monitoring of invalid request patterns
- userId tracking for user-specific issues
- Feature tags for filtering by API endpoint

## Testing Notes

- TypeScript compilation passes (verified with `pnpm tsc --noEmit`)
- All 6 files exist in `src/lib/api-validation/`
- Barrel exports work correctly (all schemas importable from `@/lib/api-validation`)
- No runtime testing yet - will be validated when integrated into routes in subsequent plans

## Next Steps

**Immediate (Plan 05-02):**
- Apply validation to check-in and plan generation routes
- Replace manual `await request.json()` calls with `validateRequestBody`
- Test error handling with invalid payloads

**Subsequent Plans:**
- 05-03: Apply validation to ticket and notification routes
- 05-04: Apply validation to admin routes

## Self-Check: PASSED

**Created files verified:**
```
FOUND: src/lib/api-validation/index.ts
FOUND: src/lib/api-validation/plans.ts
FOUND: src/lib/api-validation/tickets.ts
FOUND: src/lib/api-validation/admin.ts
FOUND: src/lib/api-validation/notifications.ts
FOUND: src/lib/api-validation/auth.ts
```

**Commits verified:**
```
FOUND: 4c21e64 (Task 1 - validateRequestBody helper)
FOUND: e2ddf89 (Task 2 - Zod validation schemas)
```

**TypeScript errors in api-validation files:**
```
None (0 errors)
```

All deliverables confirmed on disk and in git history.
