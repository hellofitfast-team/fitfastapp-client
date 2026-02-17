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

### Active (v1.1 Mobile UI Renovation)

**Navigation & Layout**
- NAV-01: Floating pill-shaped bottom nav bar (Home, Meals, Workout, Check-in, More) — visible below `lg` breakpoint
- NAV-02: Desktop horizontal top navbar replacing sidebar — visible at `lg+` breakpoint
- NAV-03: Simplified mobile header (page title + action icons, no hamburger)
- NAV-04: Bottom sheet "More" menu for secondary pages (Tracking, Progress, Tickets, FAQ)
- NAV-05: Active state indicators on nav items (highlight + accent color)
- NAV-06: Badge indicators on nav items (check-in due, unread coach message)
- NAV-07: Hide bottom nav when virtual keyboard is open

**Design System**
- DS-01: Extend @theme tokens — modern rounded corners, soft shadows, spacing scale
- DS-02: Soften brutalist palette — white background, subtle borders, modern feel
- DS-03: Typography — normal case (drop uppercase), readable fonts, proper hierarchy
- DS-04: Safe area handling — iOS notch/home indicator via env(safe-area-inset-*)
- DS-05: Animation keyframes — fadeIn, slideUp, slideDown, scaleIn (CSS-only, GPU-composited)
- DS-06: Respect prefers-reduced-motion media query

**Core Primitives**
- PRIM-01: WidgetCard — compact stat/widget card for dashboard grid
- PRIM-02: PageHeader — consistent page title + breadcrumb component
- PRIM-03: Skeleton loading variants — home cards, meal cards, workout cards, ticket list
- PRIM-04: Button press feedback — active:scale-95 + transition on all interactive elements
- PRIM-05: Empty state component — SVG illustration + message + CTA button

**Auth Pages**
- AUTH-01: Login page — modern clean layout, mobile-optimized form
- AUTH-02: Signup page — matching design, social proof elements

**Onboarding**
- ONBOARD-01: Guided wizard — one question per screen, large inputs, back/next navigation
- ONBOARD-02: Step progress indicator at top
- ONBOARD-03: Smooth transitions between steps

**Home / Dashboard**
- HOME-01: Greeting header with time-of-day context ("Good morning, Ahmed")
- HOME-02: Today's plan at-a-glance card (meal or workout focus)
- HOME-03: Quick stats widget cards (weight trend, streak, next check-in)
- HOME-04: Coach message banner when unread ticket reply exists
- HOME-05: Plan cycle countdown ("Day 8 of 14")

**Meal Plan**
- MEAL-01: Horizontal scrollable day selector (1-14) with current day highlighted
- MEAL-02: Collapsed meal cards (name, calories, ingredient preview) — tap to expand
- MEAL-03: Daily nutrition summary bar (calories, protein/carbs/fat)
- MEAL-04: Meal swap indicator surfacing AI alternatives

**Workout Plan**
- WORK-01: Day selector matching meal plan pattern (reuse component)
- WORK-02: Exercise cards with sets/reps/weight in clean grid
- WORK-03: Muscle group tags (color-coded pills)
- WORK-04: Collapsible exercise detail (summary → full set breakdown)
- WORK-05: Daily workout summary card (type, exercise count, est. duration)

**Check-in**
- CHECK-01: Step-by-step wizard (Weight → Measurements → Photos → Notes → Review)
- CHECK-02: Swipe between steps via react-swipeable
- CHECK-03: Segmented progress bar at top
- CHECK-04: Pre-fill last check-in's weight as smart default
- CHECK-05: Review summary screen before submit

**Tracking & Progress**
- TRACK-01: Renovated tracking page with modern card layout
- TRACK-02: Renovated progress charts page

**Tickets**
- TICKET-01: Chat bubble conversation view (client right/blue, coach left/gray)
- TICKET-02: Ticket list with modern card styling

**Settings & FAQ**
- SET-01: Gear icon access from header
- SET-02: Settings page with modern form layout
- FAQ-01: FAQ page with collapsible question cards

**Empty States**
- EMPTY-01: Home — "Coach is preparing your first plan" / "Account under review"
- EMPTY-02: Meal Plan — "No meal plan yet, complete check-in"
- EMPTY-03: Workout Plan — "No workout plan yet"
- EMPTY-04: Check-in — "Next check-in on [date]"
- EMPTY-05: Tickets — "No messages yet"
- EMPTY-06: Tracking/Progress — "Complete check-ins to see data"

**Desktop**
- DESK-01: Top navbar with all nav items visible
- DESK-02: Content area with max-width constraint and centered layout
- DESK-03: Responsive card grids (2-3 columns on desktop)

**RTL & Verification**
- RTL-05: All renovated components use logical properties (start/end, not left/right)
- RTL-06: Swipe directions inverted in Arabic mode
- RTL-07: Day selector scroll starts from right in RTL
- RTL-08: All renovated pages verified in Arabic at 390px and 1440px viewports
- VERIFY-01: No functionality regressions — all existing features work identically
- VERIFY-02: 44px minimum touch targets on all interactive elements
- VERIFY-03: PWA standalone mode tested (safe areas, no overlapping chrome)

### Out of Scope

- Multi-coach support — single coach per deployment is the model
- Mobile native app — Web PWA only
- Dark mode — not needed for demo
- Real-time features — high complexity, not core to demo value
- Test suite — separate effort, not blocking demo-readiness
- Grocery list aggregation — defer to v1.2
- Live workout tracking / timers — different product category
- Page-level route transitions — wait for stable View Transitions API
- Exercise illustration icons — requires asset licensing
- Social feed / community features — not the product model
- Calorie logging — FitFast prescribes plans, doesn't track intake

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
*Last updated: 2026-02-17 — v1.1 requirements defined*
