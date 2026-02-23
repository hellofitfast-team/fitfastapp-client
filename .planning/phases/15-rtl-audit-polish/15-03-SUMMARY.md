---
phase: 15-rtl-audit-polish
plan: 03
subsystem: client-pwa
tags: [pwa, safe-area, standalone, mobile]
dependency_graph:
  requires: [15-01]
  provides: [pwa-safe-areas, standalone-mode]
  affects: [client-layout, mobile-header, bottom-nav]
tech_stack:
  patterns: [env-safe-area-insets, dvh-viewport, viewport-fit-cover]
key_files:
  modified:
    - apps/client/public/manifest.json
    - apps/client/src/app/globals.css
    - apps/client/src/app/layout.tsx
    - apps/client/src/components/layouts/dashboard-shell.tsx
    - apps/client/src/components/layouts/mobile-header.tsx
decisions:
  - "background_color in manifest.json changed from #000000 to #FFFEF5 to match app background token"
  - "Safe area CSS custom properties added outside @layer for global availability"
  - "Mobile header uses pt-[env(safe-area-inset-top)] directly rather than CSS variable for Tailwind JIT compatibility"
metrics:
  duration: 227s
  completed: 2026-02-23
status: partial
---

# Phase 15 Plan 03: PWA Standalone Mode Audit and Safe Area Fixes (Partial)

PWA manifest corrected, safe area insets applied to mobile header, dynamic viewport height adopted across shell components.

## Status

**Task 1: Complete** -- PWA standalone mode audit and safe area fixes
**Task 2: Pending** -- Human checkpoint for functionality regression check and PWA standalone test

## Task 1 Summary

### PWA Manifest Verification
- `"display": "standalone"` -- already present, confirmed
- `theme_color`: `#4169E1` (royal blue) -- matches design tokens, confirmed
- `background_color`: changed from `#000000` to `#FFFEF5` (cream) -- was incorrect, now matches `--color-background`
- Icons: 192x192 and 512x512 both exist at `/icons/`, confirmed

### Viewport and Safe Area Setup
- `viewportFit: "cover"` -- already present in Next.js `Viewport` export (layout.tsx line 62)
- Added CSS custom properties to globals.css: `--safe-area-top`, `--safe-area-bottom`, `--safe-area-left`, `--safe-area-right`

### Component Safe Area Handling
- **Bottom navigation** (`bottom-nav.tsx`): Already had `pb-[env(safe-area-inset-bottom)]` -- no change needed
- **Mobile header** (`mobile-header.tsx`): Added `pt-[env(safe-area-inset-top)]` for notch/status bar in standalone mode; moved height to inner div for correct sizing
- **Dashboard shell v2** (`dashboard-shell-v2.tsx`): Already used `min-h-dvh` and `pb-[calc(var(--height-bottom-nav)+env(safe-area-inset-bottom))]` -- no change needed
- **Dashboard shell v1** (`dashboard-shell.tsx`): Changed `min-h-screen` to `min-h-dvh`
- **Root layout** (`layout.tsx`): Changed body `min-h-screen` to `min-h-dvh` for dynamic viewport height
- **More menu** (`more-menu.tsx`): Already had `pb-[env(safe-area-inset-bottom)]` -- no change needed

### What Was NOT Changed (by design)
- Desktop-only components (no notches/home indicators)
- Modal/drawer overlays (handled by Vaul internally)

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 774c514 | feat(15-03): PWA standalone mode audit and safe area fixes |

## Verification

- `pnpm --filter @fitfast/client build` -- succeeds
- `viewportFit: "cover"` confirmed in layout.tsx
- `safe-area-inset-*` usage confirmed in bottom-nav, mobile-header, dashboard-shell-v2, more-menu, globals.css
- `min-h-dvh` confirmed in layout.tsx, dashboard-shell.tsx, dashboard-shell-v2.tsx

## Awaiting

Task 2 is a `checkpoint:human-verify` requiring manual testing of:
- Functionality regression check across all pages in both EN and AR locales
- PWA standalone mode test on mobile device or simulator
