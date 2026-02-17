---
phase: 05-hardening-api-routes
plan: 04
subsystem: notification-validation-and-plan-feedback
tags: [validation, sentry, notifications, user-feedback, rely-05]
completed: 2026-02-13

dependency-graph:
  requires:
    - 05-01 (API validation infrastructure)
  provides:
    - Hardened notification routes with Zod validation
    - Plan generation failure feedback (RELY-05)
    - Sentry logging for notification and check-in errors
  affects:
    - Notification subscription routes
    - Check-in flow user experience
    - Error monitoring coverage

tech-stack:
  added: []
  patterns:
    - validateRequestBody for notification routes
    - User-facing warnings on async failures
    - Structured Sentry logging with feature tags

key-files:
  created: []
  modified:
    - src/app/api/notifications/subscription/route.ts
    - src/app/api/notifications/reminder-time/route.ts
    - src/app/[locale]/(dashboard)/check-in/page.tsx
    - src/messages/en.json
    - src/messages/ar.json

decisions:
  - "Show planGenerationWarning (user-friendly) instead of planGenerationFailed (error) to reduce user anxiety when plans are delayed"
  - "Log both meal and workout plan failures separately to Sentry for granular error tracking"

metrics:
  tasks: 2
  duration: 188s
  commits: 2
  files: 5
---

# Phase 05 Plan 04: Notification Validation and Plan Generation Feedback Summary

**One-liner:** Hardened notification routes with Zod validation and implemented RELY-05 (user-visible plan generation failure warnings) on check-in page with bilingual i18n support.

## What Was Built

### Task 1: Hardened Notification Routes
Applied Zod validation and Sentry error logging to 2 notification routes:

**1. Subscription Route** (`src/app/api/notifications/subscription/route.ts`)
- **POST handler:** Validates `onesignal_subscription_id` and `device_type` with `SubscriptionSchema`
  - Replaced manual `if (!onesignal_subscription_id)` check with `validateRequestBody`
  - Returns 400 with field-level errors on validation failure
  - Logs validation failures to Sentry automatically (via validateRequestBody)
- **DELETE handler:** Validates `onesignal_subscription_id` with `UnsubscribeSchema`
  - Same validation pattern as POST
- **Error logging:** Replaced `console.error("Error saving subscription:", error)` with `Sentry.captureException` with structured context:
  - Tags: `{ feature: "push-subscription" }`
  - Extra: `{ userId, action: "save-subscription" }`

**2. Reminder Time Route** (`src/app/api/notifications/reminder-time/route.ts`)
- **GET handler:** No validation needed (no body)
- **PUT handler:** Validates `reminder_time` (HH:MM format) with `ReminderTimeSchema`
  - Replaced manual regex check `!/^\d{2}:\d{2}$/.test(reminder_time)` with Zod validation
  - Automatic format validation, required field check, and error responses
- **Error logging:** Replaced `console.error("Error updating reminder time:", error)` with Sentry logging:
  - Tags: `{ feature: "reminder-time" }`
  - Extra: `{ userId, action: "update-reminder" }`

**Result:** All 3 notification route handlers (POST subscription, DELETE subscription, PUT reminder-time) now use type-safe validation. Zero console.error calls remain.

### Task 2: Plan Generation Failure Feedback (RELY-05)
Implemented user-visible warnings when AI plan generation fails during check-in submission.

**Before (silent failure):**
```typescript
try {
  await Promise.all([fetch("/api/plans/meal", ...), fetch("/api/plans/workout", ...)]);
} catch (planError) {
  console.error("Plan generation error:", planError); // Silent!
}
toast({ title: t("checkInSuccess"), description: t("newPlanGenerated") }); // Always shows "plans generated"
```

**After (RELY-05 compliant):**
```typescript
const [mealResponse, workoutResponse] = await Promise.all([
  fetch("/api/plans/meal", ...).catch((err) => {
    Sentry.captureException(err, { tags: { feature: "plan-generation", planType: "meal" }, ... });
    return { ok: false } as Response;
  }),
  fetch("/api/plans/workout", ...).catch((err) => {
    Sentry.captureException(err, { tags: { feature: "plan-generation", planType: "workout" }, ... });
    return { ok: false } as Response;
  }),
]);

if (!mealResponse.ok || !workoutResponse.ok) {
  toast({ title: t("checkInSuccess"), description: t("planGenerationWarning") }); // User sees warning!
} else {
  toast({ title: t("checkInSuccess"), description: t("newPlanGenerated") });
}
```

**Key improvements:**
1. **User feedback:** Clear warning toast when plans fail (not silent)
2. **Granular logging:** Separate Sentry events for meal vs workout failures with planType tag
3. **Error context:** userId and checkInId attached to every error
4. **Bilingual support:** Warning messages in both English and Arabic

**Additional Sentry integrations in check-in page:**
- Check-in lock status fetch errors now logged (was `console.error`)
- Check-in submission errors now logged with feature tag

**i18n Keys Added:**
- English: `"planGenerationWarning": "Check-in saved! Plan generation is taking longer than expected. You'll see your new plans shortly."`
- Arabic: `"planGenerationWarning": "تم حفظ التسجيل! جاري إعداد الخطة الخاصة بك. ستراها قريباً."`
- Also added `planGenerationFailed` (future use)

## How It Works

**Notification Validation Flow:**
1. User subscribes to push notifications or updates reminder time
2. Route handler calls `validateRequestBody(body, schema, { userId, feature })`
3. On validation failure: Sentry logs error + returns 400 with field errors
4. On success: Type-safe data used for Supabase operations
5. On database error: Sentry logs with structured context

**Plan Generation Feedback Flow:**
1. User submits check-in
2. Check-in saved to database
3. Parallel plan generation requests (meal + workout)
4. Each fetch wrapped in `.catch()` to prevent Promise.all rejection
5. Errors logged to Sentry with planType tag
6. Failed responses marked as `{ ok: false }`
7. If either plan failed: Show `planGenerationWarning` toast
8. If both succeeded: Show standard `newPlanGenerated` toast
9. Router navigation happens regardless (check-in always succeeds)

**Why this matters (RELY-05):**
Before this change, users had no idea when plan generation silently failed. They'd see "Your new plans are being generated" but then no plans would appear. Now they get a clear warning: "Plan generation is taking longer than expected. You'll see your new plans shortly." This reduces confusion and sets proper expectations.

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

**Upstream:**
- Uses validation schemas from 05-01-PLAN (SubscriptionSchema, UnsubscribeSchema, ReminderTimeSchema)
- Uses validateRequestBody helper from 05-01-PLAN

**Downstream:**
- Sentry dashboard will show errors tagged with:
  - `feature: "push-subscription"` / `"push-unsubscribe"` / `"reminder-time"`
  - `feature: "plan-generation"` with `planType: "meal"` or `"workout"`
  - `feature: "check-in-lock-status"` / `"check-in-submission"`
- User support tickets may decrease due to clearer plan generation feedback

**User-facing impact:**
- Notification settings now reject invalid inputs before database operations
- Check-in page provides clear feedback when AI systems are slow/failing
- Arabic-speaking users see localized error messages

## Testing Notes

- TypeScript compilation passes (1 pre-existing error in tickets route, unrelated)
- Zero `console.error` calls in all modified files (verified with grep)
- `planGenerationWarning` key exists in both en.json and ar.json
- `validateRequestBody` used 5 times across 2 routes (3 in subscription, 2 in reminder-time)

**Manual testing recommended:**
- Submit check-in while plan generation API is down (should show warning toast)
- Subscribe to push notifications with invalid subscription ID (should return 400 with Zod error)
- Update reminder time with invalid format like "25:99" (should return 400)
- Check Sentry dashboard for error grouping by feature tag

## Next Steps

**Remaining in Phase 05:**
- Apply validation to ticket routes (if not already done in 05-02 or 05-03)
- Apply validation to admin routes (OCR, signup approval, broadcast notifications)
- Verify all 13 API routes have Zod validation

**Future enhancements:**
- Add retry logic for plan generation (exponential backoff)
- Show separate warnings for meal vs workout failures ("Meal plan ready, workout plan delayed")
- Add estimated time for plan generation based on historical data

## Self-Check: PASSED

**Modified files verified:**
```
FOUND: src/app/api/notifications/subscription/route.ts
FOUND: src/app/api/notifications/reminder-time/route.ts
FOUND: src/app/[locale]/(dashboard)/check-in/page.tsx
FOUND: src/messages/en.json
FOUND: src/messages/ar.json
```

**Commits verified:**
```
FOUND: c670108 (Task 1 - Notification routes hardened)
FOUND: 8eb8cab (Task 2 - Plan generation feedback)
```

**Verification checks:**
```
✓ Zero console.error in all modified files
✓ planGenerationWarning exists in check-in page (1 occurrence)
✓ planGenerationWarning exists in en.json and ar.json (2 total)
✓ validateRequestBody used 5 times across notification routes
✓ TypeScript errors: 1 (pre-existing in tickets route, unrelated to changes)
```

All deliverables confirmed on disk and in git history.
