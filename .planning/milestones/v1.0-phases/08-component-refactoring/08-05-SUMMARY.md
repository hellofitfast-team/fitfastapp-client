---
phase: 08-component-refactoring
plan: 05
subsystem: error-handling
tags: [error-boundaries, sentry, i18n, brutalist-ui, route-segments]
dependency_graph:
  requires:
    - "08-01: Check-in page refactoring"
    - "08-02: Initial assessment refactoring"
    - "08-03: Tracking page refactoring"
    - "08-04: Progress page refactoring"
  provides:
    - "Route segment error isolation"
    - "Bilingual error messages"
    - "Sentry error tracking with route context"
  affects:
    - "All 5 critical dashboard routes"
tech_stack:
  added:
    - "Next.js error.tsx convention"
    - "Route segment error boundaries"
  patterns:
    - "Brutalist error UI design"
    - "Sentry contextual logging"
    - "i18n namespace for route errors"
key_files:
  created:
    - path: "src/app/[locale]/(dashboard)/check-in/error.tsx"
      lines: 64
      purpose: "Check-in route error boundary with Sentry logging"
    - path: "src/app/[locale]/(dashboard)/settings/error.tsx"
      lines: 64
      purpose: "Settings route error boundary"
    - path: "src/app/[locale]/(dashboard)/tickets/error.tsx"
      lines: 64
      purpose: "Tickets route error boundary"
    - path: "src/app/[locale]/(dashboard)/progress/error.tsx"
      lines: 64
      purpose: "Progress route error boundary"
    - path: "src/app/[locale]/(dashboard)/tracking/error.tsx"
      lines: 64
      purpose: "Tracking route error boundary"
  modified:
    - path: "src/messages/en.json"
      change: "Added routeErrors namespace with 5 route-specific error keys"
    - path: "src/messages/ar.json"
      change: "Added Arabic translations for route error messages"
decisions:
  - context: "Error boundary design pattern"
    choice: "Brutalist styling matching app aesthetic"
    alternatives: ["shadcn Card (used in root error.tsx)", "Minimal design", "Material Design"]
    rationale: "Consistency with FitFast's brutalist brand - border-4 border-black, shadow-[8px_8px_0px_0px_rgba(0,0,0,1)], uppercase text"
  - context: "Error namespace structure"
    choice: "routeErrors.{route}.{title|description|retry}"
    alternatives: ["Flat structure", "errors.routes.*", "Single generic message"]
    rationale: "Clear namespace separation, route-specific messages, easy to extend"
  - context: "Sentry tagging strategy"
    choice: "Route-specific tags (feature, route path)"
    alternatives: ["Generic app-level tags", "No tags", "User-level tags only"]
    rationale: "Enables filtering errors by route in Sentry dashboard for targeted debugging"
metrics:
  duration: 814
  tasks_completed: 2
  files_created: 5
  files_modified: 2
  completed_at: "2026-02-15T08:45:09Z"
---

# Phase 08 Plan 05: Route Segment Error Boundaries

**One-liner:** Isolated error handling for 5 critical dashboard routes with Sentry logging and bilingual brutalist UI

## Overview

Added route-segment-level error boundaries for check-in, settings, tickets, progress, and tracking routes. Each error boundary isolates failures to prevent entire app shell crashes, logs to Sentry with route-specific context, and displays brutalist-styled error messages in English and Arabic.

## What Was Built

### Error Boundaries (5 files, 64 lines each)
Each error boundary follows the same pattern:
- **Sentry Integration:** Logs exceptions with route-specific tags (feature name, route path)
- **Brutalist Design:** border-4 border-black, bg-cream, shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
- **Bilingual Messages:** Translated title, description, and retry button via next-intl
- **Error Digest:** Displays error.digest if available for debugging
- **Retry Functionality:** Reset button allows retry without full page reload

### i18n Updates
Added `routeErrors` namespace with 5 sub-namespaces:
- `routeErrors.checkIn`: "CHECK-IN ERROR", "We couldn't load the check-in form..."
- `routeErrors.settings`: "SETTINGS ERROR", "We couldn't load your settings..."
- `routeErrors.tickets`: "TICKETS ERROR", "We couldn't load your tickets..."
- `routeErrors.progress`: "PROGRESS ERROR", "We couldn't load your progress data..."
- `routeErrors.tracking`: "TRACKING ERROR", "We couldn't load your tracking data..."

Arabic translations provided for all keys.

## Deviations from Plan

None - plan executed exactly as written.

## Phase 8 Final Verification

### Line Count Results
**Largest client components:**
- dashboard/page.tsx: 386 lines ✅
- workout-plan/page.tsx: 378 lines ✅
- tickets/page.tsx: 351 lines ✅
- initial-assessment/page.tsx: 254 lines ✅
- tracking/_components/workout-tracking.tsx: 141 lines ✅

**Result:** ALL components under 400 lines ✅

### Success Criteria Met
✅ No client component exceeds 400 lines (largest: 386)
✅ 4 _components/ directories created (check-in, tracking, progress, initial-assessment)
✅ 5 route segment error boundaries implemented
✅ useCheckInLock hook extracted to src/hooks/
✅ TypeScript compilation passes
✅ Error boundaries log to Sentry with route-specific tags
✅ Bilingual error messages in both en and ar

## Testing Performed

- **TypeScript Validation:** `pnpm tsc --noEmit` passes without errors
- **File Verification:** All 5 error.tsx files exist at expected paths
- **Line Count Audit:** Verified all dashboard and onboarding pages/components under 400 lines
- **Component Structure:** Confirmed _components/ directories exist and hooks extracted

## Key Learnings

1. **Route segment error boundaries** are crucial for large apps - they prevent cascade failures where one route crash takes down the entire app shell
2. **Consistent styling matters** - using brutalist design across error states reinforces brand identity even in failure states
3. **Sentry tags are valuable** - route-specific tags enable quick filtering in Sentry to identify problematic routes
4. **Component refactoring pays off** - Phase 8's 400-line threshold dramatically improved maintainability (e.g., tracking page reduced from 547 to 178 lines)

## Impact

### User Experience
- **Resilience:** Route failures no longer crash the entire dashboard - users can navigate to other routes
- **Clarity:** Clear, translated error messages explain what went wrong
- **Recovery:** Retry button allows users to attempt recovery without losing context

### Developer Experience
- **Debugging:** Sentry route tags make it easy to identify which routes are failing
- **Maintainability:** Small, focused error boundaries are easy to update
- **Consistency:** All error boundaries follow the same pattern

### Phase 8 Achievement
Completed all 5 plans in Phase 8:
1. ✅ Check-in page refactoring (293 lines, down from original)
2. ✅ Initial assessment refactoring (254 lines, modular sections)
3. ✅ Tracking page refactoring (178 lines, 67% reduction from 547)
4. ✅ Progress page refactoring (242 lines, tab-based architecture)
5. ✅ Route segment error boundaries (5 routes protected)

**Phase 8 Result:** Zero components exceed 400 lines, hooks properly extracted, error isolation at route level.

## Next Steps

Phase 8 complete. Next phase from ROADMAP:
- **Phase 9:** Admin Panel Enhancement (client approval, ticket responses, analytics)
- **Phase 10:** Localization & Number Formatting (Arabic numerals, date formatting, AI prompt locale)

## Self-Check

### Created Files Verification
```
✅ FOUND: src/app/[locale]/(dashboard)/check-in/error.tsx (64 lines)
✅ FOUND: src/app/[locale]/(dashboard)/settings/error.tsx (64 lines)
✅ FOUND: src/app/[locale]/(dashboard)/tickets/error.tsx (64 lines)
✅ FOUND: src/app/[locale]/(dashboard)/progress/error.tsx (64 lines)
✅ FOUND: src/app/[locale]/(dashboard)/tracking/error.tsx (64 lines)
```

### Commit Verification
```
✅ FOUND: 31ad6f5 - feat(08-05): add route segment error boundaries
```

### Modified Files Verification
```
✅ FOUND: routeErrors namespace in src/messages/en.json
✅ FOUND: routeErrors namespace in src/messages/ar.json
```

## Self-Check: PASSED

All files created, commit exists, i18n keys added, TypeScript passes, all components under 400 lines.
