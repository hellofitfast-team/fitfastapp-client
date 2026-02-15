---
phase: 05-hardening-api-routes
plan: 03
subsystem: admin-routes
tags: [validation, security, zod, sentry, ocr]
completed: 2026-02-13

dependency-graph:
  requires:
    - 05-01 (API validation infrastructure)
  provides:
    - Hardened admin API routes with comprehensive validation
    - OCR output validation before database save (ADMIN-02)
    - No silent error suppression in admin routes (RELY-03)
  affects:
    - Admin OCR workflow (payment screenshot processing)
    - Signup approval workflow
    - Notification broadcast system

tech-stack:
  added: []
  patterns:
    - Two-layer validation for OCR (input + AI output)
    - Sentry logging for notification failures
    - Feature-tagged error tracking for admin operations

key-files:
  created: []
  modified:
    - src/app/api/admin/ocr/route.ts
    - src/app/api/admin/approve-signup/route.ts
    - src/app/api/admin/notifications/send/route.ts

decisions:
  - Use OcrResultSchema to validate AI-extracted payment data before database save (prevents corrupt data in pending_signups)
  - Log notification failures at warning level (non-critical, fire-and-forget operation)

metrics:
  tasks: 2
  duration: 209s
  commits: 2
  files: 3
---

# Phase 05 Plan 03: Admin Routes Hardening Summary

**One-liner:** Applied Zod validation and Sentry error logging to all 3 admin API routes, with critical OCR output validation preventing invalid payment data from reaching the database (ADMIN-02).

## What Was Built

Hardened all 3 admin API routes with comprehensive input validation and error tracking:

### 1. OCR Route (`src/app/api/admin/ocr/route.ts`)

**Two-layer validation approach:**

**Input validation:**
- Validates request body with `OcrRequestSchema` (imageBase64/imageUrl/signupId)
- Uses `validateRequestBody` helper for consistent error handling
- Automatic Sentry logging on validation failure

**Output validation (ADMIN-02 - Critical):**
- After AI extracts payment data from screenshot, validates with `OcrResultSchema`
- Checks all extracted fields: amount, sender_name, reference_number, date, bank
- **Prevents invalid/corrupt data from being saved to database**
- Returns 422 error with details if validation fails
- Logs failed OCR validations to Sentry with full context (raw result, errors, coach ID)

**Error handling improvements:**
- Replaced `console.error("OpenRouter OCR error:")` with Sentry (feature: "ocr-api")
- Replaced `console.error("OCR extraction error:")` with Sentry (feature: "ocr-extraction")
- All errors include coach ID and signup ID context

**Type safety:**
- Removed old `OcrResult` TypeScript interface (schema provides types)
- Uses `ocrValidation.data` for type-safe access to validated fields

### 2. Approve-Signup Route (`src/app/api/admin/approve-signup/route.ts`)

**Input validation:**
- Validates `signupId` with `ApproveSignupSchema` using `validateRequestBody`
- UUID validation prevents invalid references

**Error handling (RELY-03):**
- Replaced silent `catch {}` block on OneSignal notification with named error handler
- Logs notification failures to Sentry at warning level (non-critical operation)
- Includes coach ID, new user ID, and action context
- Never blocks response on notification failure (fire-and-forget pattern maintained)

### 3. Send Notification Route (`src/app/api/admin/notifications/send/route.ts`)

**Input validation:**
- Validates title, message, user_ids, send_to_all with `SendNotificationSchema`
- Schema's `.refine()` enforces "either send_to_all or user_ids required" constraint
- Removes manual validation logic (cleaner code)

**Error handling:**
- Replaced `console.error("Error sending notification:")` with Sentry
- Includes coach ID and send_to_all flag context
- Feature tag: "send-notification"

## How It Works

**Validation Flow (all 3 routes):**
1. Parse request body with `await request.json()`
2. Call `validateRequestBody(body, Schema, { userId, feature })`
3. On failure: automatic Sentry log + 400 response with field errors
4. On success: use typed `validation.data` in route logic

**OCR-specific Flow (two checkpoints):**
1. **Checkpoint 1 (Input):** Validate request has imageBase64 or imageUrl
2. Call OpenRouter AI to extract payment data
3. **Checkpoint 2 (Output - ADMIN-02):** Validate AI response with OcrResultSchema
4. Only save to database if validation passes
5. Return validated data to frontend

**Error Context Tracking:**
- All Sentry logs include `userId` (coach ID)
- Feature tags enable filtering by endpoint
- Extra data provides debugging context (errors, raw responses, action details)

## Deviations from Plan

None - plan executed exactly as written.

## Key Requirements Satisfied

### ADMIN-02 (OCR Output Validation)
**Requirement:** OCR extracted data validated with Zod schema before database storage

**Implementation:**
- `OcrResultSchema.safeParse(rawOcrResult)` validates AI response
- On failure: returns 422 error, logs to Sentry, prevents database write
- On success: uses `ocrValidation.data` for type-safe database update
- Database only receives validated payment data

**Impact:**
- Prevents corrupt payment records in `pending_signups` table
- Coach sees validation errors immediately (not after approval attempt)
- Sentry tracks AI extraction quality issues

### RELY-03 (No Silent Catch Blocks)
**Requirement:** Replace silent catch blocks with Sentry logging

**Implementation:**
- Approve-signup route: replaced `catch {}` with `catch (notifError)` + Sentry
- Warning level used (notification failure is non-critical)
- Includes coach ID, new user ID, and action context

**Impact:**
- Visibility into OneSignal notification failures
- Can track notification delivery issues without blocking signup flow

## Testing Notes

**Verification passed:**
- Zero TypeScript errors in modified files (1 pre-existing Next.js error unrelated to changes)
- Zero `console.error` in all 3 admin routes
- OCR route uses OcrResultSchema (2 occurrences: import + validation)
- All 3 routes use validateRequestBody (1 occurrence each)
- Silent catch in approve-signup replaced with named error handler

**Remaining silent catch:**
- OCR route has `catch {}` for JSON.parse (line 117)
- This is acceptable: immediately returns 422 error (not truly silent)
- Parsing guard, not error suppression

**Manual testing needed:**
- Test OCR with invalid payment screenshot (should return 422 with details)
- Test OCR with valid screenshot (should validate and save correctly)
- Test approve-signup notification failure (should log to Sentry but complete approval)
- Test send-notification with invalid inputs (should return 400 with field errors)

## Integration Points

**Upstream (05-01):**
- Uses `validateRequestBody` helper from api-validation infrastructure
- Uses 3 Zod schemas from admin.ts: OcrRequestSchema, OcrResultSchema, ApproveSignupSchema
- Uses SendNotificationSchema from admin.ts

**Sentry:**
- All validation failures logged automatically (via validateRequestBody)
- Manual error captures for API failures and notification issues
- Feature tags: "ocr-input", "ocr-api", "ocr-validation", "ocr-extraction", "notification", "send-notification"

**Database Protection:**
- OCR validation prevents invalid data in `pending_signups.ocr_extracted_data` column
- SignupId validation prevents invalid foreign key references

**OneSignal:**
- Notification failures now visible in Sentry (previously silent)
- Fire-and-forget pattern maintained (non-blocking)

## Next Steps

**Immediate (Plan 05-04 or later):**
- Apply validation to remaining API routes (check-in, plans, tickets)
- Test OCR validation with real payment screenshots
- Monitor Sentry for validation failure patterns

**Future Enhancements:**
- Add retry logic for transient OneSignal failures
- OCR validation could suggest corrections (e.g., "amount should be numeric")
- Track OCR validation success rate metrics

## Self-Check: PASSED

**Modified files verified:**
```
FOUND: src/app/api/admin/ocr/route.ts
FOUND: src/app/api/admin/approve-signup/route.ts
FOUND: src/app/api/admin/notifications/send/route.ts
```

**Commits verified:**
```
FOUND: 7326383 (Task 1 - OCR route hardening with ADMIN-02)
FOUND: 7ae7484 (Task 2 - approve-signup and send-notification hardening)
```

**Verification checks:**
```
TypeScript errors in modified routes: 0
console.error occurrences: 0
Silent catch blocks (critical): 0 (JSON parse catch is acceptable)
OcrResultSchema usage: 2 (import + validation)
validateRequestBody usage: 3 (all routes)
```

All deliverables confirmed on disk and in git history. ADMIN-02 requirement fully satisfied.
