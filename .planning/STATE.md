# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Every user flow works reliably, looks polished, and feels consistent in both languages
**Current focus:** v1.1 Mobile UI Renovation — Phase 11 complete, Phase 12 done, ready for Phase 13

## Current Position

Milestone: v1.1 Mobile UI Renovation
Status: In progress — Phase 14 Plan 02 complete
Phase: Phase 14 — Check-in Wizard and Onboarding
Plan: 02 complete (review screen + smart weight default)
Progress: [#############.......] 13/20 plans (65%)
Started: 2026-02-17

## Previous Milestone

v1.0 Polish & Rebrand — SHIPPED 2026-02-16
- 10 phases, 32 plans, 218 files changed, 134 commits, 9 days

## v1.1 Phase Overview

| Phase | Name | Plans | Status |
|-------|------|-------|--------|
| 11 | Foundation — Shell and Navigation | 2/2 | Complete |
| 11.1 | Auth, Authorization, and Marketing Landing Page | 7/7 | Complete |
| 12 | Design Tokens and Core Primitives | 3/3 | Complete |
| 13 | Page-Level Renovation | 0/7 | Not started |
| 14 | Check-in Wizard and Onboarding | 1/3 | In progress |
| 15 | RTL Audit and Polish | 0/3 | Not started |

Total: 5 phases, 20 plans, 65 requirements

## Accumulated Context

### Pending Todos (carried from v1.0)

- AI-generated meal/workout plans are in English even when user locale is Arabic
- Push notifications hardcoded in English
- Ticket system is single-response — needs thread-style conversation
- AI model names and parameters hardcoded — should move to env vars
- localhost:3000 fallback in OpenRouter headers

### v1.1 Notes

- UI-only milestone — no backend/API/business logic changes
- Phases start at 11 (continuing from v1.0's 10 phases)
- Phase 13 and 14 can execute in parallel (both depend on Phase 12, not each other)
- Must verify RTL/Arabic on all renovated pages (Phase 15)
- Must verify mobile (390px) and desktop (1440px) viewports
- New dependencies: Vaul (shadcn drawer) in Phase 11, react-swipeable in Phase 14
- Research recommends parallel build + swap strategy for layout components

### Key Decisions

- CSS-only animations (no framer-motion) — saves 34KB, sufficient for v1.1 scope
- Vaul for bottom sheets (via shadcn drawer) — canonical choice, ~3-5KB
- react-swipeable for check-in wizard swipe — 1.5KB, hook-based
- Parallel build + swap for layout shell — zero-risk rollback
- Marketing app uses plain ConvexProvider (not ConvexProviderWithClerk) — fully public, no auth
- getTranslations (server-side) for landing page — preserves server component benefits over useTranslations
- [11.1-01] approveSignup schedules Clerk invitation via scheduler.runAfter — Clerk API requires Node.js runtime which mutations don't have
- [11.1-01] rejectSignup stays as mutation, schedules Clerk cleanup as separate action — avoids converting mutation to action which would break existing callers
- [11.1-01] sendInvitation stores clerkInvitationId back on signup record for revocation on rejection
- [11.1-01] @clerk/backend installed at root workspace level for Convex Node.js actions
- [11.1-03] Language switcher uses usePathname() segment swap — avoids next-intl router dependency on marketing app
- [11.1-03] Hero sticky header embeds language switcher — reduces component count
- [11.1-03] Pricing badges resolve to translation keys — avoids hardcoded English in AR mode
- [11.1-04] Admin middleware uses Clerk JWT sessionClaims.metadata.role for coach check — fast, no DB query
- [11.1-04] Pending page trusts Convex real-time entirely — no manual refresh button needed
- [11.1-04] ClerkProvider cssLayerName: 'clerk' + @layer declaration in globals.css resolves Tailwind v4 cascade conflict
- [11.1-05] Pricing section owns drawer state — no changes to landing page.tsx required; CheckoutDrawer self-contained
- [11.1-05] NEXT_PUBLIC_CONVEX_SITE_URL (ending in .convex.site) added as separate env var for Convex HTTP action URLs
- [11.1-05] Screenshot upload is optional — createSignup can be called without paymentScreenshotId
- [11.1-05] Zod v4 uses "zod/v4" subpath import; @hookform/resolvers v5 supports zod v4
- [11.1-06] Signup detail page uses api.storage.getFileUrl query to resolve payment screenshot from Convex storageId
- [11.1-06] Reject action uses inline textarea expansion in signups-table (no modal) — faster UX
- [11.1-06] PlansManager uses local state + single Save button — avoids partial saves on every keystroke
- [11.1-06] Max 4 plans enforced in UI only (business rule, not backend constraint)
- [12-01] Background token changed from cream #FFFEF5 to near-white #FAFAFA — already in neutral scale, reads as white but slightly warmer
- [12-01] Typography scale documented as CSS comment (not custom properties) — Tailwind built-in utilities handle sizing; comment serves as Phase 13 guide
- [12-01] Only difference between three globals.css files is client's Clerk @layer declaration — all token values are identical
- [12-02] Entrance @keyframes placed inside @theme block — Tailwind v4 requires this for auto-generated animate-* utilities
- [12-02] animation-fill-mode: both included in --animate-* token shorthand value — prevents stagger flash when animationDelay is set via inline style
- [12-02] Wildcard reduced-motion (*, ::before, ::after with 0.01ms) replaces per-class listing — future animations automatically covered
- [12-02] animate-slide-in renamed to animate-slide-in-bottom — aligns with --animate-slide-in-bottom token; no component files used the old name
- [12-03] hover:shadow-lifted is unconditional on WidgetCard — all cards get hover shadow lift (not just clickable ones) for consistent affordance
- [12-03] active:scale standardized at 0.97 codebase-wide — bottom-nav FAB (was scale-95) and tickets link (was 0.99) corrected
- [12-03] EmptyState icon container changed from rounded-full h-14 w-14 to rounded-2xl h-16 w-16 — matches WidgetCard icon shape language
- [12-03] Skeleton variants use bg-card not bg-white — token-based for dark mode readiness
- [11-01] Badge data via single Convex query for efficiency — one reactive query per page load
- [11-01] Unread tickets = status "coach_responded" for current user
- [11-02] Renamed dashboard-shell-v2.tsx to dashboard-shell.tsx — no v1 to distinguish from
- [14-02] useEffect for weight pre-fill instead of defaultValues — handles async Convex query loading correctly
- [14-02] Section cards with divide-y rows for review layout — consistent with existing SectionCard pattern

### Roadmap Evolution

- Phase 11.1 inserted after Phase 11: Auth, Authorization, and Marketing Landing Page (URGENT)
  - Expanded scope: includes 3rd monorepo app (`apps/marketing/`) with checkout flow, pricing plans, royal blue theme
  - Full circle: marketing site -> checkout -> payment screenshot -> coach approval -> client credentials -> initial assessment
  - Skills to use during planning/execution: /brainstorming, /frontend-design, marketing-skills

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-23
Stopped at: Completed 14-02-PLAN.md — review screen + smart weight default
Resume file: .planning/phases/14-checkin-wizard-onboarding/14-02-SUMMARY.md

---
*State initialized: 2026-02-12*
*Last updated: 2026-02-23 — Phase 14 Plan 02 complete: 2 tasks, 2 commits, review screen + weight pre-fill*
