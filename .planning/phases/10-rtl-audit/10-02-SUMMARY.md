---
phase: 10-rtl-audit
plan: 02
subsystem: i18n
tags: [next-intl, locale-formatting, rtl, arabic, date-formatting, number-formatting]

# Dependency graph
requires:
  - phase: 10-01
    provides: RTL audit research and locale formatting patterns
provides:
  - Locale-aware formatDate, formatDateShort, formatDateWithWeekday, formatTime utilities using ar-u-nu-latn
  - All 12 dashboard and admin pages use centralized formatting utilities
  - Arabic dates display with Arabic month names and Western numerals (0-9)
  - No hardcoded "en-US" locale strings in date formatting
affects: [ai-i18n, notification-i18n]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ar-u-nu-latn locale for Arabic with Western numerals"
    - "Centralized date/time formatting utilities in lib/utils"
    - "useLocale() for client components, getLocale() for server components"

key-files:
  created: []
  modified:
    - src/lib/utils/index.ts
    - src/app/[locale]/(dashboard)/page.tsx
    - src/app/[locale]/(dashboard)/tickets/page.tsx
    - src/app/[locale]/(dashboard)/tickets/[id]/page.tsx
    - src/app/[locale]/(dashboard)/check-in/_components/check-in-locked.tsx
    - src/app/[locale]/(dashboard)/settings/page.tsx
    - src/app/[locale]/(dashboard)/progress/page.tsx
    - src/app/[locale]/(dashboard)/progress/_components/stats-overview.tsx
    - src/app/[locale]/(dashboard)/progress/_components/history-tab.tsx
    - src/app/[locale]/(admin)/admin/(panel)/signups/signups-table.tsx
    - src/app/[locale]/(admin)/admin/(panel)/tickets/tickets-list.tsx
    - src/app/[locale]/(admin)/admin/(panel)/clients/clients-list.tsx
    - src/app/[locale]/(admin)/admin/(panel)/clients/[id]/page.tsx

key-decisions:
  - "Use ar-u-nu-latn instead of ar-EG for Arabic locale to display Western numerals (0-9) while maintaining Arabic month names and date ordering"
  - "Create formatDateShort, formatDateWithWeekday, formatTime helpers for common formatting patterns"
  - "Remove local formatDate implementations in favor of centralized utilities"

patterns-established:
  - "All date formatting passes locale parameter from useLocale/getLocale"
  - "Server components use getLocale() from next-intl/server"
  - "Client components use useLocale() from next-intl"
  - "Chart data uses formatDateShort for compact x-axis labels"

# Metrics
duration: 9min
completed: 2026-02-15
---

# Phase 10 Plan 02: Locale-Aware Date Formatting Summary

**All date and number displays now respect user's locale with Arabic month names and Western numerals in Arabic interface**

## Performance

- **Duration:** 9 min 19 sec (559s)
- **Started:** 2026-02-15T15:20:16Z
- **Completed:** 2026-02-15T15:29:35Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Created locale-aware date/time formatting utilities using ar-u-nu-latn for Arabic with Western numerals
- Replaced all hardcoded "en-US" date formatting across 12 dashboard and admin pages
- Arabic users now see Arabic month names (يناير، فبراير، etc.) with Western numerals (0-9)
- Eliminated all bare toLocaleDateString() calls without locale parameter

## Task Commits

Each task was committed atomically:

1. **Task 1: Update utility functions for locale-aware formatting** - `e78d6be` (feat)
   - Changed ar-EG to ar-u-nu-latn for Western numerals in Arabic
   - Added formatDateShort, formatDateWithWeekday, formatTime helpers
   - Updated formatNumber to use ar-u-nu-latn

2. **Task 2: Replace all hardcoded date/number formatting in pages** - `a4ab81b` (feat)
   - Added useLocale/getLocale imports to all 12 pages
   - Replaced inline toLocaleDateString with centralized utils
   - Dashboard: formatDateWithWeekday for header
   - Tickets/Admin: formatDate for timestamps
   - Progress: formatDateShort for charts, formatDate for history
   - Server component (admin client detail) uses getLocale()

## Files Created/Modified
- `src/lib/utils/index.ts` - Added formatDateShort, formatDateWithWeekday, formatTime; changed locale to ar-u-nu-latn
- `src/app/[locale]/(dashboard)/page.tsx` - Dashboard header date with formatDateWithWeekday
- `src/app/[locale]/(dashboard)/tickets/page.tsx` - Ticket list dates with formatDate
- `src/app/[locale]/(dashboard)/tickets/[id]/page.tsx` - Ticket detail with formatDateWithTime (local helper for date+time)
- `src/app/[locale]/(dashboard)/check-in/_components/check-in-locked.tsx` - Next check-in date with ar-u-nu-latn
- `src/app/[locale]/(dashboard)/settings/page.tsx` - Plan end date formatting
- `src/app/[locale]/(dashboard)/progress/page.tsx` - Chart data and photo dates
- `src/app/[locale]/(dashboard)/progress/_components/stats-overview.tsx` - First/latest check-in dates
- `src/app/[locale]/(dashboard)/progress/_components/history-tab.tsx` - Check-in history with formatDate and formatTime
- `src/app/[locale]/(admin)/admin/(panel)/signups/signups-table.tsx` - Signup created dates
- `src/app/[locale]/(admin)/admin/(panel)/tickets/tickets-list.tsx` - Ticket timestamps
- `src/app/[locale]/(admin)/admin/(panel)/clients/clients-list.tsx` - Plan end dates
- `src/app/[locale]/(admin)/admin/(panel)/clients/[id]/page.tsx` - Plan dates and check-ins (server component)

## Decisions Made
- **Western numerals in Arabic:** Use ar-u-nu-latn instead of ar-EG to display 0-9 numerals in Arabic interface (per research, preferred for coach demo product)
- **Centralized helpers:** Added formatDateShort, formatDateWithWeekday, formatTime to lib/utils for common patterns
- **Remove duplicates:** Eliminated local formatDate implementations in tickets/page and tickets/[id]/page in favor of centralized utilities

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All date and number displays are now locale-aware
- Arabic interface shows Arabic month names with Western numerals
- Ready for remaining RTL audit tasks (component layout, number formatting in specific contexts)
- AI-generated content (meal/workout plans) still needs locale-aware generation (separate task)

## Self-Check: PASSED

All files exist:
- ✓ src/lib/utils/index.ts
- ✓ src/app/[locale]/(dashboard)/page.tsx
- ✓ src/app/[locale]/(dashboard)/tickets/page.tsx
- ✓ src/app/[locale]/(dashboard)/progress/page.tsx
- ✓ All 13 modified files present

All commits verified:
- ✓ e78d6be (Task 1: utility functions)
- ✓ a4ab81b (Task 2: page updates)

Key features verified:
- ✓ ar-u-nu-latn in utils/index.ts
- ✓ formatDateShort exists
- ✓ formatDateWithWeekday exists
- ✓ formatTime exists

---
*Phase: 10-rtl-audit*
*Completed: 2026-02-15*
