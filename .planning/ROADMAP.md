# Roadmap: FitFast — Polish & Rebrand

## Overview

This milestone transforms FitFast from functionally complete to demo-ready. We start with a visual rebrand (orange/green to Royal Blue), then systematically harden the codebase through foundation (validation schemas, retry utilities), service layer (AI generation reliability), API routes (input validation, parallelization), component layer (UX polish, refactoring), and conclude with comprehensive Arabic/RTL audit. Every phase delivers observable improvements that bring the app closer to coach-ready quality.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

**Parallelization:**
- Phase 1 and Phase 3 can run in parallel (theme independent of foundation)
- Phase 7 can run in parallel with Phase 6 (performance independent of UX polish)
- All other phases follow strict dependency chain

- [ ] **Phase 1: Theme Rebrand - Core Color Swap** - Replace orange/green with Royal Blue in CSS variables
- [ ] **Phase 2: Theme Rebrand - Visual Audit** - Verify all components and accessibility compliance
- [ ] **Phase 3: Hardening Foundation** - Create validation schemas, retry utilities, error infrastructure
- [ ] **Phase 4: Hardening Service Layer** - Wrap AI generation with retry and validation
- [ ] **Phase 5: Hardening API Routes** - Add input validation, parallelization, comprehensive error handling
- [ ] **Phase 6: UX Polish** - Consistent loading states, empty states, form validation, touch targets
- [ ] **Phase 7: Performance Optimization** - Admin pagination, chart filters for scalability
- [ ] **Phase 8: Component Refactoring** - Extract hooks, split large components, add error boundaries
- [ ] **Phase 9: Admin/Coach Polish** - OneSignal error handling, settings error surfacing
- [ ] **Phase 10: RTL Audit** - Comprehensive Arabic/bilingual experience verification

## Phase Details

### Phase 1: Theme Rebrand - Core Color Swap
**Goal**: Primary color swapped from orange/green to Royal Blue across entire app

**Depends on**: Nothing (can run parallel with Phase 3)

**Requirements**: THEME-01, THEME-02, THEME-03

**Success Criteria** (what must be TRUE):
  1. All three primary CSS variables (--color-primary, --color-primary-foreground, --color-ring) use Royal Blue HSL values in globals.css
  2. New Royal Blue palette passes WCAG AA contrast ratio (4.5:1 text, 3:1 UI) against cream background
  3. PWA manifest theme_color and meta tags reflect Royal Blue
  4. No hardcoded orange/green color values remain in codebase (verified via grep)

**Plans**: TBD (estimated 5-8 plans)

Plans:
- [ ] 01-01: TBD after planning
- [ ] 01-02: TBD after planning

### Phase 2: Theme Rebrand - Visual Audit
**Goal**: All components verified to render correctly with Royal Blue theme and meet accessibility standards

**Depends on**: Phase 1

**Requirements**: THEME-01, THEME-02, THEME-03 (validation)

**Success Criteria** (what must be TRUE):
  1. All shadcn/ui components tested in both English and Arabic modes with no visual regressions
  2. Focus states, hover states, and disabled states work correctly with Royal Blue
  3. Contrast ratios verified with Chrome DevTools for all interactive elements
  4. Cross-browser testing confirms consistent appearance (Chrome, Safari, Firefox)

**Plans**: TBD (estimated 5-8 plans)

Plans:
- [ ] 02-01: TBD after planning
- [ ] 02-02: TBD after planning

### Phase 3: Hardening Foundation
**Goal**: Reusable validation schemas, retry utilities, and error infrastructure established for all hardening work

**Depends on**: Nothing (can run parallel with Phase 1)

**Requirements**: RELY-01 (partial - foundation for all error handling)

**Success Criteria** (what must be TRUE):
  1. Zod schemas exist for meal plans, workout plans, and all API inputs
  2. Exponential backoff retry utility implemented with configurable max attempts and jitter
  3. Error boundary wrapper component created for route segment isolation
  4. Custom error types defined for domain errors (ValidationError, RetryError, etc.)
  5. All foundation utilities have TypeScript types and JSDoc comments

**Plans**: TBD (estimated 6-10 plans)

Plans:
- [ ] 03-01: TBD after planning
- [ ] 03-02: TBD after planning

### Phase 4: Hardening Service Layer
**Goal**: AI generation and Supabase queries reliable with retry logic and validation

**Depends on**: Phase 3

**Requirements**: RELY-01 (partial), RELY-02, RELY-04

**Success Criteria** (what must be TRUE):
  1. OpenRouter API client wrapped in retry utility with 3 attempts and exponential backoff
  2. All JSON.parse calls in AI pipeline wrapped in try-catch with Sentry logging
  3. Meal plan and workout plan AI responses validated with Zod schemas before database save
  4. Supabase query functions extracted to lib/supabase/queries/ for reusability
  5. Service layer errors include context (userId, action, timestamp) for debugging

**Plans**: TBD (estimated 7-10 plans)

Plans:
- [ ] 04-01: TBD after planning
- [ ] 04-02: TBD after planning

### Phase 5: Hardening API Routes
**Goal**: All API routes validate inputs, execute efficiently, and provide comprehensive error feedback

**Depends on**: Phase 4

**Requirements**: RELY-03, RELY-05, PERF-01, ADMIN-02

**Success Criteria** (what must be TRUE):
  1. All API routes validate inputs with Zod before processing
  2. Check-in page fetches profile, assessment, and lock status in parallel (Promise.all)
  3. All silent .catch(() => {}) patterns replaced with Sentry logging and user feedback
  4. Plan generation failures display clear warning message to user (not silent)
  5. OCR extracted data validated with Zod schema before database storage
  6. All API errors logged with full context and sent to Sentry
  7. Non-critical operations (notifications) use fire-and-forget pattern

**Plans**: TBD (estimated 8-12 plans)

Plans:
- [ ] 05-01: TBD after planning
- [ ] 05-02: TBD after planning

### Phase 6: UX Polish
**Goal**: Consistent, professional user experience across all pages with proper loading, error, and empty states

**Depends on**: Phase 5

**Requirements**: UX-01, UX-02, UX-03, UX-04

**Success Criteria** (what must be TRUE):
  1. All pages show skeleton/loading states during data fetch (no blank screens)
  2. All "no data" scenarios display designed empty states with guidance (no plans, no tickets, etc.)
  3. All forms use inline validation on blur with clear error messages
  4. All interactive elements meet 48x48px minimum touch target size
  5. Loading states, error messages, and empty states use consistent design language

**Plans**: TBD (estimated 8-12 plans)

Plans:
- [ ] 06-01: TBD after planning
- [ ] 06-02: TBD after planning

### Phase 7: Performance Optimization
**Goal**: App scales to 1000+ clients without performance degradation

**Depends on**: Phase 5 (can run parallel with Phase 6)

**Requirements**: PERF-02, PERF-03

**Success Criteria** (what must be TRUE):
  1. Admin clients list uses pagination with page size controls (supports 1000+ clients)
  2. Progress charts have date range filter (last 30/90/all days)
  3. Large lists load under 2 seconds on realistic data volumes
  4. Database queries use proper indexes (verified with EXPLAIN ANALYZE if needed)

**Plans**: TBD (estimated 5-7 plans)

Plans:
- [ ] 07-01: TBD after planning
- [ ] 07-02: TBD after planning

### Phase 8: Component Refactoring
**Goal**: Large components split into maintainable pieces with extracted hooks and error boundaries

**Depends on**: Phase 5

**Requirements**: No direct requirements (supports overall reliability and maintainability)

**Success Criteria** (what must be TRUE):
  1. No client component exceeds 400 lines (measured via cloc)
  2. Reusable logic extracted to custom hooks (use-check-in-form.ts, etc.)
  3. Error boundaries added at route segment level for isolated error recovery
  4. Large components split into _components/ subdirectories for organization
  5. Data fetching moved to Server Components where possible (Client Components only for interactivity)

**Plans**: TBD (estimated 6-9 plans)

Plans:
- [ ] 08-01: TBD after planning
- [ ] 08-02: TBD after planning

### Phase 9: Admin/Coach Polish
**Goal**: Coach admin panel handles errors gracefully with clear feedback

**Depends on**: Phase 5

**Requirements**: ADMIN-01, ADMIN-03

**Success Criteria** (what must be TRUE):
  1. OneSignal initialization failures surface to user with disabled notification UI and info message
  2. OneSignal errors logged to Sentry with context
  3. Settings page errors shown to user via toast notifications
  4. Settings page errors logged to Sentry (no silent swallowing)
  5. Admin panel provides clear feedback for all error states

**Plans**: TBD (estimated 5-7 plans)

Plans:
- [ ] 09-01: TBD after planning
- [ ] 09-02: TBD after planning

### Phase 10: RTL Audit
**Goal**: Arabic/RTL experience is polished and complete across all user flows

**Depends on**: Phases 1, 2, 6 (all visual/functional changes complete)

**Requirements**: RTL-01, RTL-02, RTL-03, RTL-04

**Success Criteria** (what must be TRUE):
  1. All pages audited in Arabic locale with zero layout breaks or visual regressions
  2. Progress bars and directional UI elements respect RTL (fill right-to-left in Arabic)
  3. Numbers and dates formatted with proper locale-aware formatting in both languages
  4. All translation keys present with no missing keys or raw fallback text visible
  5. Both client and coach flows work identically well in English and Arabic

**Plans**: TBD (estimated 7-10 plans)

Plans:
- [ ] 10-01: TBD after planning
- [ ] 10-02: TBD after planning

## Progress

**Execution Order:**
Sequential: 1 → 2 → 4 → 5 → 6 → 8 → 9 → 10
Parallel opportunities: Phase 1 with Phase 3, Phase 6 with Phase 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Theme Core | 0/TBD | Not started | - |
| 2. Theme Audit | 0/TBD | Not started | - |
| 3. Foundation | 0/TBD | Not started | - |
| 4. Service Layer | 0/TBD | Not started | - |
| 5. API Routes | 0/TBD | Not started | - |
| 6. UX Polish | 0/TBD | Not started | - |
| 7. Performance | 0/TBD | Not started | - |
| 8. Refactoring | 0/TBD | Not started | - |
| 9. Admin Polish | 0/TBD | Not started | - |
| 10. RTL Audit | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-12*
*Last updated: 2026-02-12*
