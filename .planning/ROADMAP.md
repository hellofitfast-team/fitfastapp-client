# Roadmap: FitFast

## Milestones

- ✅ **v1.0 Polish & Rebrand** — Phases 1-10 (shipped 2026-02-16) — [archive](milestones/v1.0-ROADMAP.md)
- 🔄 **v1.1 Mobile UI Renovation** — Phases 11-15 (started 2026-02-17)

## Phases

<details>
<summary>✅ v1.0 Polish & Rebrand (Phases 1-10) — SHIPPED 2026-02-16</summary>

- [x] Phase 1: Theme Rebrand - Core Color Swap (3/3 plans) — completed 2026-02-12
- [x] Phase 2: Theme Rebrand - Visual Audit (3/3 plans) — completed 2026-02-12
- [x] Phase 3: Hardening Foundation (2/2 plans) — completed 2026-02-12
- [x] Phase 4: Hardening Service Layer (2/2 plans) — completed 2026-02-12
- [x] Phase 5: Hardening API Routes (4/4 plans) — completed 2026-02-13
- [x] Phase 6: UX Polish (5/5 plans) — completed 2026-02-13
- [x] Phase 7: Performance Optimization (1/1 plan) — completed 2026-02-13
- [x] Phase 8: Component Refactoring (5/5 plans) — completed 2026-02-15
- [x] Phase 9: Admin/Coach Polish (2/2 plans) — completed 2026-02-15
- [x] Phase 10: RTL Audit (5/5 plans) — completed 2026-02-15

</details>

### v1.1 Mobile UI Renovation

- [ ] **Phase 11: Foundation — Shell and Navigation** - New responsive layout shell with bottom nav, top nav, mobile header, and safe area handling
- [ ] **Phase 11.1: Auth, Authorization, and Marketing Landing Page** - Clerk roles (coach/client), admin coach detection fix, marketing site with checkout, client subscription journey (INSERTED)
- [ ] **Phase 12: Design Tokens and Core Primitives** - Extended theme tokens, animation keyframes, and reusable UI primitives
- [ ] **Phase 13: Page-Level Renovation** - Renovate all dashboard pages, auth pages, and empty states using new shell and primitives
- [ ] **Phase 14: Check-in Wizard and Onboarding** - Multi-step swipeable check-in form and guided onboarding assessment
- [ ] **Phase 15: RTL Audit and Polish** - Full RTL verification, accessibility audit, and PWA standalone testing

## Phase Details

### Phase 11: Foundation — Shell and Navigation
**Goal**: Users navigate the app through a modern mobile-native shell with thumb-friendly bottom navigation and a clean desktop top navbar
**Depends on**: v1.0 complete (Phase 10)
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, NAV-06, NAV-07, DS-04, DS-05, DESK-01
**Success Criteria** (what must be TRUE):
  1. On mobile (below `lg`), a floating pill-shaped bottom nav bar with 5 items is visible and navigates between Home, Meals, Workout, Check-in, and More
  2. On desktop (`lg+`), a horizontal top navbar replaces the sidebar with all nav items visible
  3. The mobile header shows page title and action icons without a hamburger menu
  4. Tapping "More" opens a bottom sheet with links to Tracking, Progress, Tickets, and FAQ
  5. The bottom nav hides when the virtual keyboard is open and respects iOS safe areas (notch/home indicator)
**Plans**: TBD

Plans:
- [ ] 11-01: Responsive dashboard shell and mobile header
- [ ] 11-02: Bottom navigation bar with active states and badges
- [ ] 11-03: Desktop top navbar
- [ ] 11-04: Bottom sheet "More" menu, keyboard hiding, and safe area handling

### Phase 11.1: Auth, Authorization, and Marketing Landing Page (INSERTED)

**Goal:** The full client acquisition circle works end-to-end: prospect lands on marketing site → picks a plan → submits payment screenshot (InstaPay/Vodafone Cash) → receives credentials via email → awaits coach approval → logs in → completes initial assessment. Coach users are properly identified via Clerk roles and can access the admin panel. Client users are gated by approval status and plan tier.
**Depends on:** None (infrastructure — can run in parallel with Phase 11)
**Scope:**
  - **Marketing Landing Page** (`apps/marketing/`): 3rd monorepo app — hero, pricing plans, trust signals, checkout form with payment screenshot upload. Royal blue theme consistent with client/admin apps. Mobile-first, conversion-optimized.
  - **Clerk Role System**: `coach` vs `client` roles via Clerk public metadata. Admin panel gated to `coach` role. Client PWA gated to approved `client` role.
  - **Client Subscription Journey**: Checkout → Convex stores signup + payment proof → Coach receives notification → Coach approves in admin panel → Clerk account created → Client gets credentials via email → First login triggers initial assessment.
  - **Admin Coach Detection Fix**: Admin login correctly identifies coach users via Clerk metadata instead of failing with "This account does not have coach access."
**Plans:** 4/7 plans executed

Plans:
- [x] 11.1-01-PLAN.md — Convex backend: schema updates, Clerk actions, HTTP upload, plans config
- [x] 11.1-02-PLAN.md — Marketing app scaffolding (Next.js, i18n, Convex, design tokens)
- [ ] 11.1-03-PLAN.md — Marketing landing page (Hero, Features, Pricing, Trust signals)
- [ ] 11.1-04-PLAN.md — Admin RBAC middleware, accept-invite page, pending page real-time
- [ ] 11.1-05-PLAN.md — Checkout drawer with form, file upload, and confirmation page
- [ ] 11.1-06-PLAN.md — Admin signup detail, rejection reason, plans & payment methods settings
- [ ] 11.1-07-PLAN.md — End-to-end verification checkpoint

### Phase 12: Design Tokens and Core Primitives
**Goal**: A consistent design vocabulary exists so every renovated page shares the same visual language
**Depends on**: Phase 11
**Requirements**: DS-01, DS-02, DS-03, DS-06, PRIM-01, PRIM-02, PRIM-03, PRIM-04, PRIM-05
**Success Criteria** (what must be TRUE):
  1. The app uses softened colors (white backgrounds, subtle borders) instead of the brutalist black/cream scheme
  2. Typography uses normal case throughout — no all-uppercase headings — with a clear size hierarchy
  3. Animation keyframes (fadeIn, slideUp, slideDown, scaleIn) are defined and respect prefers-reduced-motion
  4. WidgetCard, PageHeader, Skeleton variants, EmptyState, and button press feedback primitives are available and visually consistent
**Plans**: TBD

Plans:
- [ ] 12-01: Design tokens — palette, typography, spacing, shadows, and safe-area variables
- [ ] 12-02: Animation keyframes and reduced-motion support
- [ ] 12-03: Core UI primitives (WidgetCard, PageHeader, Skeleton variants, EmptyState, button feedback)

### Phase 13: Page-Level Renovation
**Goal**: Every dashboard page, auth page, and empty state uses the new design system and feels like a modern mobile-native app
**Depends on**: Phase 12
**Requirements**: HOME-01, HOME-02, HOME-03, HOME-04, HOME-05, MEAL-01, MEAL-02, MEAL-03, MEAL-04, WORK-01, WORK-02, WORK-03, WORK-04, WORK-05, TRACK-01, TRACK-02, TICKET-01, TICKET-02, SET-01, SET-02, FAQ-01, EMPTY-01, EMPTY-02, EMPTY-03, EMPTY-04, EMPTY-05, EMPTY-06, AUTH-01, AUTH-02, DESK-02, DESK-03
**Success Criteria** (what must be TRUE):
  1. The home screen shows a time-of-day greeting, today's plan card, quick stats widgets, coach message banner, and plan cycle countdown
  2. Meal and workout plan pages have a horizontal day selector (1-14) and collapsible cards that expand to show full details
  3. The ticket conversation view uses chat bubbles (client right/blue, coach left/gray)
  4. All six empty states show contextual SVG illustrations, friendly messages, and CTA buttons
  5. Auth pages (login/signup) have a modern clean layout optimized for mobile
**Plans**: TBD

Plans:
- [ ] 13-01: Home screen renovation (greeting, widgets, plan card, coach banner, countdown)
- [ ] 13-02: Meal plan page (day selector, collapsible cards, nutrition summary, swap indicator)
- [ ] 13-03: Workout plan page (day selector, exercise cards, muscle tags, collapsible details, summary)
- [ ] 13-04: Tickets renovation (chat bubbles, ticket list cards)
- [ ] 13-05: Tracking, progress, settings, and FAQ pages
- [ ] 13-06: Empty states (all 6 screens) and auth pages (login/signup)
- [ ] 13-07: Desktop responsive layout (max-width constraint, card grids)

### Phase 14: Check-in Wizard and Onboarding
**Goal**: The check-in flow feels like a guided wizard with swipe navigation, and onboarding walks new users through assessment one question at a time
**Depends on**: Phase 12
**Requirements**: CHECK-01, CHECK-02, CHECK-03, CHECK-04, CHECK-05, ONBOARD-01, ONBOARD-02, ONBOARD-03
**Success Criteria** (what must be TRUE):
  1. The check-in form presents steps one at a time (Weight, Measurements, Photos, Notes, Review) with a segmented progress bar at top
  2. Users can swipe left/right between check-in steps on mobile
  3. The review screen shows a full summary of all entered data before submission
  4. The onboarding assessment shows one question per screen with large inputs and smooth back/next transitions
**Plans**: TBD

Plans:
- [ ] 14-01: Check-in step wizard with progress bar and swipe navigation
- [ ] 14-02: Check-in review summary and smart defaults
- [ ] 14-03: Onboarding guided wizard renovation

### Phase 15: RTL Audit and Polish
**Goal**: Every renovated component works flawlessly in Arabic/RTL and the app passes accessibility and PWA quality gates
**Depends on**: Phase 13, Phase 14
**Requirements**: RTL-05, RTL-06, RTL-07, RTL-08, VERIFY-01, VERIFY-02, VERIFY-03
**Success Criteria** (what must be TRUE):
  1. All renovated components use logical CSS properties (start/end) — no physical left/right
  2. Swipe directions are inverted in Arabic mode and the day selector scrolls from right in RTL
  3. Every renovated page looks correct in Arabic at both 390px and 1440px viewports
  4. All interactive elements have minimum 44px touch targets
  5. No functionality regressions — every feature that worked in v1.0 still works identically
**Plans**: TBD

Plans:
- [ ] 15-01: Logical property audit and RTL swipe/scroll fixes
- [ ] 15-02: Arabic visual verification at 390px and 1440px
- [ ] 15-03: Touch target audit, functionality regression check, and PWA standalone test

## Progress

**Execution Order:** 11 -> 12 -> 13 (and 14 in parallel) -> 15

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 11. Foundation — Shell and Navigation | v1.1 | 0/4 | Not started | - |
| 11.1. Auth, Authorization, and Marketing Landing Page | 4/7 | In Progress|  | - |
| 12. Design Tokens and Core Primitives | v1.1 | 0/3 | Not started | - |
| 13. Page-Level Renovation | v1.1 | 0/7 | Not started | - |
| 14. Check-in Wizard and Onboarding | v1.1 | 0/3 | Not started | - |
| 15. RTL Audit and Polish | v1.1 | 0/3 | Not started | - |

---
*Roadmap created: 2026-02-12*
*Last updated: 2026-02-17 — v1.1 phases added*
