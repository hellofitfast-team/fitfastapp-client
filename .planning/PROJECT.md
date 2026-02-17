# FitFast — AI-Powered Fitness Coaching PWA

## What This Is

An AI-powered fitness coaching PWA for the Egyptian/MENA market, polished and demo-ready. The app handles the full client lifecycle: signup, onboarding, AI-generated meal/workout plans, check-ins with photo uploads, progress tracking, and coach administration. Fully bilingual (English + Arabic/RTL) with Royal Blue branding.

## Current State

**Shipped:** v1.0 Polish & Rebrand (2026-02-16)
**Active:** v1.1 Mobile UI Renovation (started 2026-02-17)
**Codebase:** 16,905 LOC TypeScript across 218 files
**Stack:** Next.js 16.1.6, React 19, Supabase SSR 0.8, Tailwind v4, shadcn/ui

**What's working:**
- Client flow: login → onboarding → dashboard → check-in → AI plans → tracking
- Coach flow: admin login → signups → clients → tickets → settings
- Arabic/RTL: 490/490 translation keys, logical CSS, locale-aware formatting
- Reliability: Zod validation on all 13 API endpoints, retry logic, Sentry error tracking
- UX: Skeleton loading, empty states, inline validation, 48px touch targets, error boundaries

**Known limitations (tech debt from v1.0):**
- AI-generated plans in English only regardless of locale
- Push notifications in English only
- Ticket system is single-response (no thread conversations)
- AI model names and parameters hardcoded (not env vars)

## Current Milestone: v1.1 Mobile UI Renovation

**Goal:** Transform the brutalist desktop-first UI into a modern, clean, mobile-native experience. UI-only milestone — no backend, API, or business logic changes. Same functionality, completely new look and feel.

**Design Decisions:**

| Decision | Choice |
|----------|--------|
| Style direction | Modern & clean (rounded corners, subtle shadows, soft transitions — like Fitbod/Apple Health) |
| Color palette | Keep Royal Blue as primary, soften the brutalist black/cream scheme |
| Typography | Normal case (drop all-uppercase), modern readable fonts |
| Mobile nav | Pill-shaped floating bottom nav: Home, Meals, Workout, Check-in |
| Desktop nav | Top navbar (replace current sidebar) |
| Settings access | Gear icon in header |
| Secondary pages | Bottom sheet "more menu" for Tracking, Progress, Tickets, FAQ |
| Home page | Widget-style scrollable cards (stats, today's meals, today's workout, quick actions) |
| Meal plan | Collapsed cards (tap to expand ingredients/instructions) |
| Check-in form | Swipe between steps with progress bar at top |
| Onboarding assessment | Guided wizard (one question per screen, large inputs) |
| Tickets | Chat bubbles (client right/blue, coach left/gray) |
| Empty states | SVG illustrations + friendly message + CTA button |
| Scope | Full renovation: auth + onboarding + all dashboard pages |

## Core Value

Every user flow — from signup to plan generation to coach approval — works reliably, looks polished, and feels consistent in both languages.

## Requirements

### Validated

- ✓ THEME-01: Primary CSS variables swapped to Royal Blue — v1.0
- ✓ THEME-02: WCAG AA contrast ratio verified — v1.0
- ✓ THEME-03: PWA manifest/meta tags updated — v1.0
- ✓ RELY-01: JSON.parse wrapped with error handling — v1.0
- ✓ RELY-02: OpenRouter retry (3x, exponential backoff) — v1.0
- ✓ RELY-03: Silent .catch() replaced with Sentry — v1.0
- ✓ RELY-04: AI output validated with Zod — v1.0
- ✓ RELY-05: Plan generation failure warning to user — v1.0
- ✓ UX-01: Skeleton loading states — v1.0
- ✓ UX-02: Empty states with guidance — v1.0
- ✓ UX-03: Inline form validation on blur — v1.0
- ✓ UX-04: 48x48px touch targets — v1.0
- ✓ PERF-01: Check-in parallel data fetching — v1.0
- ✓ PERF-02: Admin clients pagination — v1.0
- ✓ PERF-03: Progress chart date range filter — v1.0 (pre-existing)
- ✓ RTL-01: All pages audited in Arabic — v1.0
- ✓ RTL-02: Progress bars respect RTL — v1.0
- ✓ RTL-03: Locale-aware date/number formatting — v1.0
- ✓ RTL-04: Translation key parity (490/490) — v1.0
- ✓ ADMIN-01: OneSignal failure visibility — v1.0
- ✓ ADMIN-02: OCR Zod validation — v1.0
- ✓ ADMIN-03: Settings error toast + Sentry — v1.0

### Active

(v1.1 requirements TBD — research phase in progress)

### Out of Scope

- Multi-coach support — single coach per deployment is the model
- Mobile native app — Web PWA only
- Dark mode — not needed for demo
- Real-time features — high complexity, not core to demo value
- Test suite — separate effort, not blocking demo-readiness

## Constraints

- **Single coach per instance** — not SaaS, sold as one-off to individual coaches
- **Both languages equally** — MENA market requires Arabic/RTL quality
- **Cost efficiency** — <$0.20 USD per client per month for AI
- **Demo-ready bar** — coach walking through app sees zero broken states
- **Existing stack** — Next.js 16 / React 19 / Supabase / Tailwind v4 / shadcn/ui

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Royal Blue as primary color | User preference for rebrand | ✓ Good — clean professional look |
| Polish over new features | Get existing app solid before expanding | ✓ Good — 22/22 requirements met |
| Both languages equally | MENA market requires Arabic/RTL quality | ✓ Good — 490/490 keys, Playwright verified |
| Demo-ready as done criteria | Next step is selling to coaches | ✓ Good — all flows functional |
| Skip test suite for now | Focus on visible UX, not infrastructure | ⚠️ Revisit — consider for v1.1 |
| Semantic Tailwind classes over hex | Maintainability and theme consistency | ✓ Good — zero hardcoded colors |
| Zod for all validation | Consistent validation at API boundaries | ✓ Good — 13 endpoints covered |
| FormProvider pattern for large forms | Avoid prop drilling through 5+ steps | ✓ Good — clean component hierarchy |
| ar-u-nu-latn for Arabic numbers | Western numerals (0-9) for readability | — Pending user feedback |
| Error boundaries per route segment | Isolate failures, prevent cascading crashes | ✓ Good — 5 routes protected |

---
*Last updated: 2026-02-16 after v1.0 milestone*
