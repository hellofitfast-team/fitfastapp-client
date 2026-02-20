# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Every user flow works reliably, looks polished, and feels consistent in both languages
**Current focus:** v1.1 Mobile UI Renovation — roadmap complete, ready for phase planning

## Current Position

Milestone: v1.1 Mobile UI Renovation
Status: In progress — Phase 11.1 executing
Phase: Phase 11.1 — Auth, Authorization, and Marketing Landing Page
Plan: 01, 02, 03, 04, and 06 complete (backend infra + marketing app scaffold + marketing landing page + admin RBAC + accept-invite + real-time pending + signup detail + plans/payment-methods manager)
Progress: [#####...............] 5/20 plans (25%)
Started: 2026-02-17

## Previous Milestone

v1.0 Polish & Rebrand — SHIPPED 2026-02-16
- 10 phases, 32 plans, 218 files changed, 134 commits, 9 days

## v1.1 Phase Overview

| Phase | Name | Plans | Status |
|-------|------|-------|--------|
| 11 | Foundation — Shell and Navigation | 4 | Not started |
| 12 | Design Tokens and Core Primitives | 3 | Not started |
| 13 | Page-Level Renovation | 7 | Not started |
| 14 | Check-in Wizard and Onboarding | 3 | Not started |
| 15 | RTL Audit and Polish | 3 | Not started |

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
- [11.1-06] Signup detail page uses api.storage.getFileUrl query to resolve payment screenshot from Convex storageId
- [11.1-06] Reject action uses inline textarea expansion in signups-table (no modal) — faster UX
- [11.1-06] PlansManager uses local state + single Save button — avoids partial saves on every keystroke
- [11.1-06] Max 4 plans enforced in UI only (business rule, not backend constraint)

### Roadmap Evolution

- Phase 11.1 inserted after Phase 11: Auth, Authorization, and Marketing Landing Page (URGENT)
  - Expanded scope: includes 3rd monorepo app (`apps/marketing/`) with checkout flow, pricing plans, royal blue theme
  - Full circle: marketing site → checkout → payment screenshot → coach approval → client credentials → initial assessment
  - Skills to use during planning/execution: /brainstorming, /frontend-design, marketing-skills

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-20
Stopped at: Completed 11.1-06-PLAN.md (Signup Detail + Plans Manager + Payment Methods Manager)
Resume file: None

---
*State initialized: 2026-02-12*
*Last updated: 2026-02-20 — Phase 11.1 plan 06 complete: Signup detail page with payment screenshot, rejection reason flow, bilingual pricing plans CRUD, payment methods CRUD in admin settings*
