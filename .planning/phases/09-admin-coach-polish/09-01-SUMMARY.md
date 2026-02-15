---
phase: 09-admin-coach-polish
plan: 01
subsystem: notifications
tags: [error-handling, observability, ux]
dependency-graph:
  requires: [sentry, onesignal, use-notifications-hook]
  provides: [onesignal-error-tracking, graceful-degradation-ui]
  affects: [dashboard-settings, notification-system]
tech-stack:
  added: []
  patterns: [error-context-propagation, conditional-ui-rendering]
key-files:
  created: []
  modified:
    - src/components/pwa/OneSignalProvider.tsx
    - src/hooks/use-notifications.ts
    - src/app/[locale]/(dashboard)/settings/page.tsx
    - src/messages/en.json
    - src/messages/ar.json
decisions:
  - Use module-scoped error state in hook instead of React context (simpler, no extra provider)
  - Log best-effort OneSignal syncs at warning level (not errors) since they're non-critical
  - Hide notification toggle completely when error exists (better UX than disabled state)
  - Use amber color scheme for warning box (consistent with toast patterns)
metrics:
  duration: 346s
  completed: 2026-02-15T14:40:06Z
---

# Phase 09 Plan 01: OneSignal Graceful Degradation Summary

**One-liner:** OneSignal initialization failures now log to Sentry with feature tags and show amber warning UI instead of broken toggle.

## What Was Built

Added comprehensive error handling for OneSignal push notification failures:

1. **Sentry Integration:**
   - OneSignalProvider logs init failures with feature/integration tags
   - use-notifications hook logs all caught errors (subscription checks, permission requests, toggle operations)
   - Best-effort OneSignal sync failures logged at warning level
   - All errors include contextual tags (feature, operation) for granular debugging

2. **Error State Propagation:**
   - use-notifications hook exposes `error` field (string | null)
   - Error set to "onesignal_unavailable" when subscription check fails
   - Downstream components can conditionally render based on error state

3. **User-Facing UI:**
   - Settings page shows amber warning box when OneSignal unavailable
   - Warning explains possible causes (ad blockers, browser settings)
   - Notification toggle and reminder time inputs hidden when error exists
   - Brutalist styling consistent with app design (border-4, font-black, uppercase)
   - Bilingual support (English + Arabic translations)

## Deviations from Plan

None - plan executed exactly as written.

## Technical Implementation

**OneSignalProvider.tsx:**
- Replaced `console.error` with `Sentry.captureException` in catch block
- Adds tags: `{ feature: "push-notifications", integration: "onesignal" }`
- Includes context: appId presence, NODE_ENV

**use-notifications.ts:**
- Added `error` state to hook return value
- Updated 6 catch blocks with Sentry logging:
  - `checkSubscription()`: Sets error state, logs to Sentry
  - `requestPermission()`: Logs permission request failures
  - `toggleSubscription()`: Logs toggle operation failures
  - 3 best-effort OneSignal sync calls: Log at warning level (non-critical)

**settings/page.tsx:**
- Destructured `error: notifError` from `useNotifications()`
- Added `AlertTriangle` icon import
- Conditional render: amber warning box OR toggle + reminder time UI
- Warning box uses consistent brutalist styling (border-4 border-black bg-amber-50)

**i18n:**
- Added `notificationsUnavailableTitle` and `notificationsUnavailableDescription` keys
- English: "Notifications Unavailable" / "Push notifications could not be initialized..."
- Arabic: "الإشعارات غير متاحة" / "تعذر تهيئة الإشعارات..."

## Testing Notes

**Type Safety:**
- `pnpm tsc --noEmit` passes (pre-existing admin settings form errors unrelated)
- No type errors in modified files

**Code Quality:**
- No remaining `console.error` calls in OneSignalProvider
- No remaining empty catch blocks (`catch(() => {})`) in use-notifications
- 1 Sentry call in OneSignalProvider, 6 in use-notifications (verified via grep)

**i18n Coverage:**
- Both `notificationsUnavailableTitle` and `notificationsUnavailableDescription` exist in en.json and ar.json
- Settings page correctly references new keys via `t("notificationsUnavailableTitle")`

## Self-Check: PASSED

**Created Files:**
- None (all modifications)

**Modified Files:**
- ✓ src/components/pwa/OneSignalProvider.tsx (exists, Sentry import added, catch block updated)
- ✓ src/hooks/use-notifications.ts (exists, error state added, 6 Sentry calls added)
- ✓ src/app/[locale]/(dashboard)/settings/page.tsx (exists, conditional UI added, notifError destructured)
- ✓ src/messages/en.json (exists, 2 new keys added)
- ✓ src/messages/ar.json (exists, 2 new keys added)

**Commits:**
- ✓ f0a8819: feat(09-01): add OneSignal error tracking with Sentry
- ✓ d0ce026: feat(09-01): add disabled notification UI for OneSignal errors

All files and commits verified present.

## Impact

**User Experience:**
- Users with ad blockers no longer see broken notification toggles
- Clear explanation of why notifications unavailable (not just "doesn't work")
- No confusing UI states (hidden instead of disabled)

**Developer Experience:**
- All OneSignal errors tracked in Sentry with feature/operation tags
- Easy to filter and debug notification issues
- No silent failures hiding problems

**Observability:**
- Can measure OneSignal initialization failure rate
- Can correlate failures with ad blocker usage, browser types
- Warning-level logs for best-effort syncs prevent alert fatigue
