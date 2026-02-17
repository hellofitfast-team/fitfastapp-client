---
phase: 01-theme-rebrand-core-color-swap
plan: 01
subsystem: design-system
tags:
  - color-system
  - theme
  - ui-components
  - foundation
dependency_graph:
  requires: []
  provides:
    - Royal Blue primary color system
    - Semantic color classes in all UI components
    - PWA theme color configuration
  affects:
    - All downstream UI pages
    - Component library consumers
tech_stack:
  added: []
  patterns:
    - Tailwind v4 CSS custom properties
    - Semantic color naming
key_files:
  created: []
  modified:
    - src/app/globals.css
    - public/manifest.json
    - src/app/layout.tsx
    - src/components/ui/button.tsx
    - src/components/ui/input.tsx
    - src/components/ui/textarea.tsx
    - src/components/ui/checkbox.tsx
    - src/components/ui/slider.tsx
    - src/components/ui/select.tsx
    - src/components/ui/dropdown-menu.tsx
    - src/components/ui/dialog.tsx
    - src/components/ui/toast.tsx
    - src/components/ui/tabs.tsx
    - src/components/ui/card.tsx
decisions:
  - Renamed --color-orange/green to --color-brand-orange/green to preserve original colors while establishing new primary
  - Used 'cream' semantic class (--color-cream: #FFFEF5) instead of hardcoded hex for consistency
  - Kept error-500 and success-500 unchanged (semantic colors for states, not branding)
  - Active/selected states use 'primary' (Royal Blue), destructive states use 'error-500'
metrics:
  duration_seconds: 329
  tasks_completed: 2
  files_modified: 14
  commits: 2
  completed_at: 2026-02-12T14:22:13Z
---

# Phase 01 Plan 01: Core Color Swap Summary

Royal Blue color system foundation established with semantic Tailwind classes across all UI components.

## What Was Done

### Task 1: Update CSS custom properties and PWA theme color
- Added `--color-primary: #4169E1` (Royal Blue) with light/dark variants
- Added `--color-primary-foreground: #FFFEF5` (cream text on blue)
- Added `--color-accent: #4169E1` (alias for primary)
- Changed `--color-ring: #4169E1` (focus rings now Royal Blue)
- Renamed `--color-orange` to `--color-brand-orange` (preserved original)
- Renamed `--color-green` to `--color-brand-green` (preserved original)
- Updated PWA `manifest.json` theme_color to #4169E1
- Updated Next.js `layout.tsx` viewport themeColor to #4169E1
- Changed scrollbar hover color to use `var(--color-primary)`
- Preserved error-500 (#FF3B00) and success-500 (#00FF94) unchanged

**Commit:** `a2979ba`

### Task 2: Replace hardcoded hex values in all UI components
Replaced all hardcoded `#FF3B00` and `#00FF94` hex values with semantic Tailwind classes in 11 UI components:

**Color mapping applied:**
- Brand/primary accents: `#FF3B00` → `primary` (Royal Blue)
- Error/destructive states: `#FF3B00` → `error-500` (preserved semantic meaning)
- Success/completion indicators: `#00FF94` → `success-500` (preserved semantic meaning)
- Active/selected states: `#00FF94` → `primary` (Royal Blue for brand consistency)
- Cream backgrounds: `#FFFEF5` → `cream`

**Components updated:**
- **button.tsx**: Ring, default variant hover, link variant text, destructive uses error-500
- **input.tsx**: Background and error border
- **textarea.tsx**: Background and error border
- **checkbox.tsx**: Background and checked state
- **slider.tsx**: Range fill and thumb hover
- **select.tsx**: Background and selected indicator
- **dropdown-menu.tsx**: All backgrounds and selected indicators
- **dialog.tsx**: Background and close button hover
- **toast.tsx**: Variant backgrounds, destructive uses error-500, success uses success-500
- **tabs.tsx**: Background, active tab text, focus rings
- **card.tsx**: Background

**Commit:** `79836a3`

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification checks passed:

1. ✅ No hardcoded `#FF3B00` or `#00FF94` in any UI component
2. ✅ Royal Blue (#4169E1) present in globals.css, manifest.json, layout.tsx
3. ✅ Error color (--color-error-500: #FF3B00) preserved
4. ✅ Success color (--color-success-500: #00FF94) preserved
5. ✅ TypeScript compilation successful
6. ✅ Production build successful

## Success Criteria Met

- [x] Royal Blue (#4169E1) is the primary color in CSS custom properties
- [x] PWA manifest and viewport meta tag both show #4169E1
- [x] All 11 UI components use semantic Tailwind classes (no hardcoded orange/green hex)
- [x] Error and success semantic colors are preserved (FF3B00 for errors, 00FF94 for success)
- [x] Application builds successfully

## Impact

This plan establishes the color system foundation for the entire theme rebrand. All downstream plans (page files, feature components) will now automatically use Royal Blue as the primary brand color through semantic class names.

**Before:** Components used hardcoded `#FF3B00` (orange) for brand accents
**After:** Components reference `primary` which resolves to `#4169E1` (Royal Blue)

## Next Steps

Continue to Phase 01 Plan 02: Update authentication pages (login, magic-link, set-password, welcome) to use the new color system.

## Self-Check: PASSED

All files and commits verified to exist.
