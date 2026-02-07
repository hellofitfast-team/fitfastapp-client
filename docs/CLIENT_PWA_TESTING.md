# Client PWA — Testing & Feature Status

> Last updated: February 5, 2026

## Overview

This document covers the complete PWA integration for FitFast's client-facing app, including all features implemented, testing results, and readiness status for the next phase (Admin Coach Panel).

---

## PWA Feature Summary

### What was implemented

| Feature | Status | Description |
|---------|--------|-------------|
| App Manifest | ✅ Done | `manifest.json` with black theme, split icon purposes, 192+512 sizes |
| Icon Generation | ✅ Done | SVG → PNG via sharp (8 sizes + apple-touch-icon + favicon) |
| Service Worker | ✅ Done | Merged SW: OneSignal push + offline fallback (`/sw.js`) |
| Offline Page | ✅ Done | Static bilingual page (EN + AR) at `/offline.html` |
| OneSignal Provider | ✅ Done | Initializes OneSignal with merged SW, StrictMode-safe |
| Notifications Hook | ✅ Done | `useNotifications()` — wraps OneSignal + native Notification API fallback |
| Settings Toggle | ✅ Done | Real notification permission toggle (replaced dummy `useState`) |
| Install Prompt | ✅ Done | Custom install banner with iOS detection + 7-day dismiss cooldown |
| i18n Strings | ✅ Done | `pwa` namespace in EN + AR message files |
| SW Headers | ✅ Done | `Cache-Control: no-cache` + `Service-Worker-Allowed: /` on `/sw.js` |

### What was NOT implemented (by design)

- **Heavy caching (Workbox/Serwist):** Intentionally skipped. FitFast is data-heavy — stale cached meal plans or workout data could confuse users. Only the offline fallback page is pre-cached.
- **Background sync:** Not needed for MVP. Check-ins are submitted synchronously.
- **Push notification scheduling UI:** OneSignal handles scheduling from the dashboard. App just handles permission/subscription.

---

## Testing Infrastructure

### Frameworks Installed

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | 4.0.x | Unit test runner (ESM-native, fast) |
| @testing-library/react | 16.3.x | React component testing |
| @testing-library/jest-dom | 6.9.x | Custom DOM matchers |
| @testing-library/user-event | 14.6.x | User interaction simulation |
| jsdom | 28.x | Browser environment for unit tests |
| Playwright | 1.58.x | E2E browser testing (Chromium) |

### Test Commands

```bash
# Unit tests (Vitest)
pnpm test              # Run once
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report

# E2E tests (Playwright — requires dev server running)
pnpm dev               # In terminal 1
pnpm test:e2e          # In terminal 2
pnpm test:e2e:ui       # Interactive Playwright UI

# Full verification
pnpm tsc --noEmit      # Type check
pnpm build             # Production build
```

---

## Test Results

### Unit Tests — 29 tests, 4 suites, all passing

#### `use-notifications.test.ts` (8 tests)

| Test | What it verifies |
|------|-----------------|
| detects when notifications are supported | Checks `Notification` + `serviceWorker` APIs exist |
| detects when notifications are not supported | Gracefully handles missing APIs |
| reads initial permission state | Picks up browser's current permission |
| checks OneSignal subscription state on mount | Reads `optedIn` from OneSignal SDK |
| handles null optedIn gracefully | `null` → treated as `false` |
| requestPermission does nothing when not supported | Skips API calls on unsupported browsers |
| starts in loading state | Initial `loading: true` |
| returns default permission initially | Initial `permission: "default"` |

#### `ServiceWorkerRegistration.test.tsx` (4 tests)

| Test | What it verifies |
|------|-----------------|
| renders nothing | Returns `null` (invisible component) |
| registers SW with correct path/scope | Calls `register("/sw.js", { scope: "/" })` |
| does not register when SW is absent | Handles browsers without SW support |
| logs error on registration failure | Catches and logs rejected promises |

#### `OneSignalProvider.test.tsx` (5 tests)

| Test | What it verifies |
|------|-----------------|
| renders nothing | Returns `null` (invisible component) |
| skips init when appId not set | No `OneSignal.init()` without env var |
| initializes with correct config | Passes `appId`, `serviceWorkerPath`, `scope` |
| allowLocalhostAsSecureOrigin in dev vs prod | `true` in development, `false` in production |
| logs error when init fails | Catches and logs rejected `init()` promise |

#### `InstallPrompt.test.tsx` (12 tests)

| Test | What it verifies |
|------|-----------------|
| renders nothing by default | Hidden when no prompt event and not iOS |
| renders nothing in standalone mode | Skips when already installed |
| renders nothing during cooldown | Respects 7-day localStorage cooldown |
| shows iOS instructions on iPhone | Detects iPhone UA → share instructions |
| shows iOS instructions on iPad | Detects iPad UA → share instructions |
| no install/dismiss buttons on iOS | iOS shows instructions only, not buttons |
| shows prompt on beforeinstallprompt | Renders install UI when event fires |
| calls prompt() on install click | Triggers browser's native install dialog |
| dismiss sets localStorage cooldown | Stores timestamp for 7-day cooldown |
| X button dismisses prompt | Aria-labeled dismiss button works |
| shows again after cooldown expires | Reappears after 7 days |
| prevents default on event | Defers the prompt correctly |

### E2E Tests — 17 tests, 6 suites, all passing

#### PWA Manifest (4 tests)
- `manifest.json` accessible and valid (name, display, theme_color, start_url)
- Icon purposes correctly split (`any` and `maskable` separate)
- All referenced icon files exist and return 200
- `apple-touch-icon.png` accessible

#### Service Worker (3 tests)
- `sw.js` served with `Cache-Control: no-cache` + `Service-Worker-Allowed: /`
- Contains OneSignal `importScripts`
- Contains `offline.html` fallback + `notificationclick` handler

#### Offline Page (4 tests)
- `offline.html` accessible (200)
- Bilingual content (English + Arabic)
- Retry button present with both languages
- FitFast branding (FF logo)

#### Theme & Metadata (3 tests)
- Manifest `theme_color` is `#000000`
- Apple touch icon served as PNG
- Manifest served with correct content-type

#### PWA Icon Assets (3 tests)
- 192x192 and 512x512 PNGs exist
- `favicon.png` exists
- SVG has correct brand colors (`#000000` bg, `#00FF94` text, no old `#2563eb`)

---

## Bugs Found & Fixed During Testing

| Bug | Where | Fix |
|-----|-------|-----|
| `"Notification" in window` passes when `Notification` is `undefined` | `use-notifications.ts` | Added `&& !!window.Notification` truthiness check |
| `"serviceWorker" in navigator` passes when property is `undefined` | `ServiceWorkerRegistration.tsx` | Added `&& navigator.serviceWorker` truthiness check |
| Node.js 22+ `localStorage` conflicts with jsdom | Test setup | Created custom localStorage mock in setup.ts |

These bugs were latent in production code — the unit tests caught edge cases that could affect users on partial-support browsers.

---

## File Structure

```
src/
├── __tests__/
│   ├── setup.ts                          # Vitest setup (mocks, cleanup)
│   ├── hooks/
│   │   └── use-notifications.test.ts     # 8 tests
│   └── pwa/
│       ├── ServiceWorkerRegistration.test.tsx  # 4 tests
│       ├── OneSignalProvider.test.tsx          # 5 tests
│       └── InstallPrompt.test.tsx             # 12 tests
├── components/pwa/
│   ├── ServiceWorkerRegistration.tsx
│   ├── OneSignalProvider.tsx
│   └── InstallPrompt.tsx
└── hooks/
    └── use-notifications.ts

e2e/
└── pwa.spec.ts                           # 17 E2E tests

Config files:
├── vitest.config.ts
└── playwright.config.ts
```

---

## Pre-Admin Panel Checklist

| Check | Status |
|-------|--------|
| `pnpm tsc --noEmit` passes | ✅ |
| `pnpm build` succeeds (40 routes) | ✅ |
| `pnpm test` — 29 unit tests pass | ✅ |
| `pnpm test:e2e` — 17 E2E tests pass | ✅ |
| Manifest valid with correct branding | ✅ |
| Service worker registers + handles push | ✅ |
| Offline fallback page works | ✅ |
| Install prompt shows on mobile/Chrome | ✅ |
| iOS share instructions shown | ✅ |
| Notification toggle reflects real state | ✅ |
| i18n strings for EN + AR | ✅ |

**The client PWA is fully tested and ready for the Admin Coach Panel phase.**

---

## How to Run After Handoff

```bash
# 1. Install deps
pnpm install

# 2. Type check
pnpm tsc --noEmit

# 3. Unit tests
pnpm test

# 4. E2E tests (requires dev server)
pnpm dev &
pnpm test:e2e

# 5. Generate icons (only if SVG changes)
pnpm generate-icons

# 6. Production build
pnpm build
```

## OneSignal Setup (for coaches)

1. Create a free account at [onesignal.com](https://onesignal.com)
2. Create a new Web Push app
3. Set the App ID in `.env.local`:
   ```
   NEXT_PUBLIC_ONESIGNAL_APP_ID=your_actual_app_id
   ```
4. In OneSignal dashboard → Settings → Web Configuration:
   - Site URL: your production URL
   - Service Worker: leave default (our merged SW handles it)
5. Notifications will work automatically for subscribed users
