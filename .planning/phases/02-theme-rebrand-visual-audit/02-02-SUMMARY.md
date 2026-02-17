---
phase: 02-theme-rebrand-visual-audit
plan: 02
subsystem: theme-system
tags: [refactoring, colors, semantic-design, charts]
dependency_graph:
  requires: ["01-01-SUMMARY.md"]
  provides: ["semantic-color-consistency", "centralized-chart-colors"]
  affects: ["ui-components", "loading-states", "auth-pages", "admin-panel", "charts"]
tech_stack:
  added: ["CHART_COLORS constant for Recharts"]
  patterns: ["centralized color constants for SVG libraries", "semantic warning colors"]
key_files:
  created: []
  modified:
    - src/components/ui/card.tsx
    - src/app/[locale]/(dashboard)/meal-plan/loading.tsx
    - src/app/[locale]/(dashboard)/workout-plan/loading.tsx
    - src/app/[locale]/(auth)/set-password/page.tsx
    - src/components/admin/admin-sidebar.tsx
    - src/app/[locale]/(admin)/admin/login/page.tsx
    - src/components/charts/ProgressCharts.tsx
decisions:
  - title: "Use semantic warning-500 for medium password strength"
    rationale: "Medium strength is a warning state, making warning-500 more semantically accurate than Tailwind's generic orange classes"
    alternatives: ["Keep bg-orange-400", "Create custom password-medium color"]
    chosen: "warning-500"
  - title: "Use bg-stone-900 for admin sidebar instead of hardcoded #1C1917"
    rationale: "Admin panel uses distinct dark theme with warm neutral tones. stone-900 is semantically correct for admin dark backgrounds."
    alternatives: ["bg-neutral-950", "Keep hardcoded hex with comment"]
    chosen: "bg-stone-900"
  - title: "Keep decorative admin login pattern hex with comment"
    rationale: "Admin login radial gradient is decorative branding, separate from theme system. Comment makes intent clear."
    alternatives: ["Extract to CSS variable", "Remove pattern entirely"]
    chosen: "Keep with explanatory comment"
  - title: "Centralize chart colors in CHART_COLORS constant"
    rationale: "Recharts uses SVG attributes that don't resolve CSS variables. Centralized constant provides single source of truth while maintaining compatibility."
    alternatives: ["Use CSS variables (incompatible with SVG)", "Keep scattered inline hex"]
    chosen: "CHART_COLORS constant"
metrics:
  duration: 413s
  tasks_completed: 2
  files_modified: 7
  commits: 2
  completed_at: 2026-02-12T16:49:25Z
---

# Phase 02 Plan 02: Hardcoded Color Cleanup Summary

**One-liner:** Replaced all scattered hardcoded hex and non-semantic Tailwind colors with semantic classes and centralized chart color constants.

## What Was Done

### Task 1: UI Components, Loading Skeletons, Auth Pages, and Admin Colors

**Files Modified:**
- `src/components/ui/card.tsx` - Replaced `bg-[#FFFEF5]` with semantic `bg-cream`
- `src/app/[locale]/(dashboard)/meal-plan/loading.tsx` - Both skeleton occurrences now use `bg-cream`
- `src/app/[locale]/(dashboard)/workout-plan/loading.tsx` - Both skeleton occurrences now use `bg-cream`
- `src/app/[locale]/(auth)/set-password/page.tsx` - Password strength indicator uses semantic `bg-warning-500`/`text-warning-500` instead of `bg-orange-400`/`text-orange-500`
- `src/components/admin/admin-sidebar.tsx` - Replaced `bg-[#1C1917]` with semantic `bg-stone-900`
- `src/app/[locale]/(admin)/admin/login/page.tsx` - Added explanatory comment for decorative radial gradient pattern

**Commit:** 9e9ff01

### Task 2: Chart Color Centralization

**Files Modified:**
- `src/components/charts/ProgressCharts.tsx` - Created `CHART_COLORS` constant with primary, cream, black, success colors. Replaced all inline hex values in Recharts configuration (CartesianGrid, XAxis, YAxis, Tooltip, Line components).

**Pattern Established:** Recharts components use SVG attributes that don't support CSS variables. The `CHART_COLORS` constant provides a centralized, documented mapping to the theme system while maintaining compatibility with SVG rendering.

**Commit:** 40d0900

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

**Hardcoded Hex Scan:**
```bash
grep -rn '#[0-9A-Fa-f]\{6\}' src/ --include='*.tsx' | grep -v 'layout.tsx.*themeColor' | grep -v 'CHART_COLORS' | grep -v 'decorative'
```
✅ Result: Only layout.tsx themeColor, CHART_COLORS constant, and commented decorative pattern

**Non-Semantic Tailwind Classes:**
```bash
grep -rn 'bg-orange-\|text-orange-\|bg-green-\|text-green-' src/ --include='*.tsx'
```
✅ Result: Zero matches

**TypeScript Compilation:**
```bash
pnpm tsc --noEmit
```
✅ Result: Clean compilation

**Production Build:**
⚠️ Pre-existing Next.js middleware manifest error unrelated to color changes (ENOENT: _clientMiddlewareManifest.json)

## Impact Assessment

**Before:**
- Card component used hardcoded `bg-[#FFFEF5]`
- Loading skeletons hardcoded cream background 4 times
- Password strength used generic Tailwind orange classes
- Admin sidebar used hardcoded warm dark hex
- Charts scattered 6+ inline hex values throughout Recharts configuration

**After:**
- All UI components use semantic `bg-cream` class
- Password strength uses semantic `bg-warning-500` (semantically accurate for warning state)
- Admin sidebar uses semantic `bg-stone-900` (warm neutral for admin dark theme)
- Charts use centralized `CHART_COLORS` constant with 4 documented theme color mappings
- Single intentional decorative hex (#92400e in admin login pattern) with clear comment

**Benefits:**
- Theme changes now require updating globals.css + CHART_COLORS only
- Semantic color usage improves code maintainability
- Password strength indicator semantically correct (warning = caution state)
- Admin panel uses semantic neutrals instead of magic numbers
- Charts maintain compatibility with SVG while centralizing color references

## Self-Check: PASSED

**Files created:** None (refactoring-only plan)

**Files modified:**
- [x] src/components/ui/card.tsx - exists, contains `bg-cream`
- [x] src/app/[locale]/(dashboard)/meal-plan/loading.tsx - exists, contains `bg-cream`
- [x] src/app/[locale]/(dashboard)/workout-plan/loading.tsx - exists, contains `bg-cream`
- [x] src/app/[locale]/(auth)/set-password/page.tsx - exists, contains `warning-500`
- [x] src/components/admin/admin-sidebar.tsx - exists, contains `bg-stone-900`
- [x] src/app/[locale]/(admin)/admin/login/page.tsx - exists, contains decorative comment
- [x] src/components/charts/ProgressCharts.tsx - exists, contains `CHART_COLORS`

**Commits verified:**
- [x] 9e9ff01 - exists (Task 1: UI/auth/admin color cleanup)
- [x] 40d0900 - exists (Task 2: chart color centralization)

**Verification commands passed:**
- [x] No scattered hardcoded hex values (only intentional patterns)
- [x] No non-semantic Tailwind orange/green classes
- [x] TypeScript compiles cleanly
