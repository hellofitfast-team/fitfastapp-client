# Phase 11 Research: Foundation — Shell and Navigation

**Researched:** 2026-02-17
**Source:** Milestone-level research (ARCHITECTURE.md, STACK.md, PITFALLS.md) + codebase analysis

## Current State

### Files to Replace
- `src/components/layouts/dashboard-shell.tsx` — Client component with sidebar toggle state
- `src/components/layouts/sidebar.tsx` — 272px fixed sidebar with 9 nav items, mobile overlay
- `src/components/layouts/header.tsx` — Sticky header with hamburger, lang switch, bell, user menu
- `src/components/layouts/index.ts` — Barrel exports

### Files That Use the Shell
- `src/app/[locale]/(dashboard)/layout.tsx` — Imports `DashboardShell` from `@/components/layouts`, passes `userName`

### Key Observations
1. `DashboardShell` takes `{children, userName}` — simple interface to preserve
2. Header has logout, lang switch, notifications — must preserve all functionality
3. Sidebar has 9 nav items with translation keys — reuse the same keys
4. RTL support uses logical properties (`start-0`, `border-e-4`) — continue this
5. Active state detection: `pathWithoutLocale === item.href` — reuse this logic
6. `min-h-screen` used on the root shell div — replace with `min-h-dvh`
7. Noise texture overlay exists — keep it (part of the brand)
8. `InstallPrompt` and `OneSignalIdentity` components exist in shell — keep them

## Execution Plan

### Plan 11-01: Dashboard Shell + Mobile Header
1. Create `mobile-header.tsx` — page title + lang switch + bell + user menu
2. Create `dashboard-shell-v2.tsx` — responsive container using new components
3. Add nav animation keyframes to `globals.css`
4. Add layout dimension tokens to `@theme`

### Plan 11-02: Bottom Navigation Bar
1. Create `bottom-nav.tsx` — 5 items, active states, fixed position
2. Create `useKeyboardVisible` hook for keyboard detection
3. Content area padding for bottom nav clearance

### Plan 11-03: Desktop Top Navbar
1. Create `desktop-top-nav.tsx` — all 9 nav items horizontal
2. Active state with brutalist inversion

### Plan 11-04: Bottom Sheet + Safe Areas
1. Install vaul, create `drawer.tsx` shadcn component
2. Create "More" menu bottom sheet
3. Update viewport meta for `viewport-fit=cover`
4. Swap shell in barrel exports

## Dependencies to Install
- `vaul` (~5KB gzip) — for Drawer/bottom sheet

## Risk Mitigations
- Build all new files alongside existing ones
- Swap with single import change in `index.ts`
- Keep `DashboardShellProps` interface identical
- Preserve all PWA components (InstallPrompt, OneSignalIdentity)
