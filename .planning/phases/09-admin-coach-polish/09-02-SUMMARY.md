---
phase: 09-admin-coach-polish
plan: 02
subsystem: admin-error-handling
tags: [error-handling, toast-feedback, sentry, error-boundaries, admin-panel, i18n]
dependencies:
  requires:
    - phase-08-05 (route error boundaries pattern)
    - shadcn/ui toaster component
    - @sentry/nextjs integration
  provides:
    - admin-settings-error-handling
    - admin-toast-feedback
    - admin-error-boundaries
  affects:
    - admin panel UX (now shows feedback on save)
    - admin error monitoring (Sentry with admin tags)
tech-stack:
  added:
    - useToast hook in admin panel
    - Toaster component in admin layout
  patterns:
    - try-catch with Supabase error checking in forms
    - toast for async operation feedback
    - error.tsx boundaries for route-level errors
    - Sentry tagging with panel: admin for admin-specific errors
key-files:
  created:
    - src/app/[locale]/(admin)/admin/(panel)/error.tsx (panel-level error boundary)
    - src/app/[locale]/(admin)/admin/(panel)/settings/error.tsx
    - src/app/[locale]/(admin)/admin/(panel)/signups/error.tsx
    - src/app/[locale]/(admin)/admin/(panel)/tickets/error.tsx
  modified:
    - src/app/[locale]/(admin)/admin/(panel)/settings/settings-form.tsx
    - src/app/[locale]/(admin)/admin/(panel)/layout.tsx
    - src/messages/en.json
    - src/messages/ar.json
decisions:
  - key: toast-replaces-saved-state
    rationale: "Toast provides better UX feedback than inline 'Saved' state - user gets notification even if they navigate away, and error messages can show specific details"
    alternatives: ["Keep saved state + add toast", "Use inline error messages"]
    decision: "Replace saved state with toast-only feedback"
  - key: check-promise-all-results
    rationale: "Promise.all doesn't throw if individual promises have Supabase errors - must explicitly filter and check results to catch silent failures"
    alternatives: ["Promise.allSettled", "Sequential updates with early return"]
    decision: "Filter Promise.all results and throw if any have errors"
  - key: brutalist-errors-in-admin
    rationale: "Admin panel uses same error boundary pattern as dashboard (Phase 8) for brand consistency - brutalist styling is part of FitFast identity"
    alternatives: ["Simpler admin-specific error UI", "Native Next.js error styling"]
    decision: "Use brutalist error.tsx pattern with bg-cream cards and uppercase titles"
metrics:
  duration: 303s
  completed_at: 2026-02-15
  tasks: 2
  files: 11
---

# Phase 09 Plan 02: Admin Error Handling & Toast Feedback Summary

**One-liner:** Admin settings form now shows toast feedback on save/error with Sentry logging, and all admin routes have error boundaries with brutalist styling.

## What Was Built

### Task 1: Admin Settings Form Error Handling + Toaster in Layout
- Wrapped `handleSave` in try-catch with explicit error checking for Promise.all results
- Added success toast on save and destructive toast on failure
- Log all errors to Sentry with tags: `feature: "admin-settings"`, `operation: "update-config"`, `panel: "admin"`
- Added Toaster component to admin panel layout
- Removed `saved` state (replaced by toast feedback)
- Added 4 i18n keys for toast messages (saveSuccess, saveSuccessDescription, saveError, saveErrorGeneric) in both English and Arabic

### Task 2: Admin Route Error Boundaries + i18n
- Created 4 error.tsx files following brutalist pattern from Phase 8:
  - `(panel)/error.tsx` - Panel-level fallback (catches errors in dashboard, etc.)
  - `settings/error.tsx` - Settings route errors
  - `signups/error.tsx` - Signups route errors
  - `tickets/error.tsx` - Tickets route errors
- Each error boundary:
  - Logs to Sentry with `panel: "admin"` tag + route-specific feature/route tags
  - Uses brutalist styling (bg-cream card, border-4, shadow-[8px_8px], uppercase title)
  - Shows localized error message, error digest (if available), and retry button
- Added 4 admin error i18n keys under `routeErrors` namespace in both languages

## Deviations from Plan

None - plan executed exactly as written. All Supabase errors are now explicitly checked and surfaced via toast.

## Verification Results

All verification criteria passed:
- ✓ `pnpm tsc --noEmit` passes with no errors
- ✓ Sentry.captureException present in settings-form.tsx
- ✓ 2 toast() calls in settings-form.tsx (success + error)
- ✓ Toaster component in admin panel layout
- ✓ All 4 error.tsx files exist
- ✓ Each error.tsx contains Sentry.captureException with `panel: "admin"` tag
- ✓ adminSettings/adminPanel/adminSignups/adminTickets keys in both en.json and ar.json
- ✓ Promise.all results explicitly checked for errors before throwing

## Key Implementation Details

**Error Checking Pattern:**
```typescript
const results = await Promise.all([...updates]);
const errors = results.filter((r) => r.error);
if (errors.length > 0) {
  throw new Error(`Failed to update ${errors.length} setting(s): ${errors.map((e) => e.error?.message).join(", ")}`);
}
```

**Toast Feedback:**
- Success: Default toast variant with title + description
- Error: Destructive toast with error message (or generic fallback)

**Sentry Tagging:**
- Admin-specific: `panel: "admin"` on all admin errors
- Feature: `admin-settings`, `admin-signups-page`, `admin-tickets-page`, `admin-panel`
- Operation: `update-config` (for settings form)

**i18n Structure:**
- Toast messages under `admin` namespace (settings-specific)
- Error boundaries under `routeErrors` namespace (consistent with dashboard)

## Testing Notes

To verify:
1. Navigate to `/admin/settings`
2. Change a setting and click Save → should see "Settings Saved" toast
3. Simulate Supabase error (disconnect network) → should see destructive toast with error message and Sentry log
4. Force error boundary (e.g., throw in settings page) → should see brutalist error UI with retry button
5. Test in both English and Arabic to verify all i18n keys work

## Success Criteria Met

- ✅ Settings form shows success toast on save, destructive toast on failure
- ✅ Settings form logs all errors to Sentry with admin-settings feature tag
- ✅ No Supabase errors are silently swallowed (Promise.all results checked)
- ✅ Toaster component rendered in admin panel layout
- ✅ 4 admin route error boundaries with brutalist styling
- ✅ Error boundaries log to Sentry with panel: "admin" tag
- ✅ All error messages available in English and Arabic

## Commits

- `383d1c9`: feat(09-02): add error handling + toast to admin settings
- `155e976`: feat(09-02): add error boundaries for admin routes

## Self-Check: PASSED

**Created files exist:**
- ✓ src/app/[locale]/(admin)/admin/(panel)/error.tsx
- ✓ src/app/[locale]/(admin)/admin/(panel)/settings/error.tsx
- ✓ src/app/[locale]/(admin)/admin/(panel)/signups/error.tsx
- ✓ src/app/[locale]/(admin)/admin/(panel)/tickets/error.tsx

**Commits exist:**
- ✓ 383d1c9 present in git log
- ✓ 155e976 present in git log

**Modified files contain expected changes:**
- ✓ settings-form.tsx has Sentry.captureException and toast calls
- ✓ layout.tsx imports and renders Toaster
- ✓ en.json and ar.json have saveSuccess and adminSettings keys
