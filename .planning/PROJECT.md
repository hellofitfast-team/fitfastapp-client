# FitFast — Polish & Rebrand Milestone

## What This Is

A polish and refinement milestone for FitFast, an AI-powered fitness coaching PWA for the Egyptian/MENA market. The app is functionally complete — this milestone is about auditing every user flow end-to-end (client + coach, English + Arabic), fixing bugs, hardening error handling, optimizing UX, and rebranding from orange/green to Royal Blue. The goal is demo-ready quality: walk a coach through it and nothing embarrasses you.

## Core Value

Every user flow — from signup to plan generation to coach approval — works reliably, looks polished, and feels consistent in both languages.

## Requirements

### Validated

- ✓ Client auth (magic link signup, login, session persistence) — existing
- ✓ Onboarding flow (profile creation, initial assessment) — existing
- ✓ AI meal plan generation via OpenRouter/DeepSeek V3 — existing
- ✓ AI workout plan generation via OpenRouter/DeepSeek V3 — existing
- ✓ Check-in flow with photo uploads — existing
- ✓ Client dashboard with streaks, progress, schedule — existing
- ✓ Weight/measurement tracking with charts — existing
- ✓ Support ticket system — existing
- ✓ Coach admin panel (signup approval, client management, tickets) — existing
- ✓ OCR payment verification via Qwen VL — existing
- ✓ Push notifications via OneSignal — existing
- ✓ PWA with service worker and offline fallback — existing
- ✓ Bilingual support (English + Arabic/RTL) — existing
- ✓ Sentry error tracking — existing
- ✓ RLS on all tables — existing

### Active

- [ ] Swap color theme from orange/green to Royal Blue (primary color swap only)
- [ ] Audit and fix client flow end-to-end (signup → onboarding → dashboard → check-in → plans)
- [ ] Audit and fix coach/admin flow end-to-end (login → signups → clients → tickets → notifications)
- [ ] Audit and fix Arabic/RTL experience in both flows
- [ ] Fix JSON.parse calls without error handling in AI pipeline
- [ ] Add retry logic to OpenRouter API calls (3 retries, exponential backoff)
- [ ] Fix silent error swallowing (.catch(() => {}) patterns)
- [ ] Fix plan generation silent failure on check-in (log to DB, show user warning)
- [ ] Validate AI plan output with Zod before database save
- [ ] Add pagination to admin clients list (scales to 1000 clients)
- [ ] Fix OneSignal initialization failure visibility (Sentry + user feedback)
- [ ] Harden OCR data validation (Zod schema before storage)
- [ ] Optimize check-in page performance (reduce sequential Supabase calls)
- [ ] Fix unhandled promise rejections in settings page
- [ ] General UX polish: loading states, error messages, empty states, consistency

### Out of Scope

- New features (token usage dashboard, plan versioning, email notifications) — future milestone
- Test suite creation — separate effort, not blocking demo-readiness
- Reducing `as any`/`as never` casts — type system cleanup is separate from UX polish
- Multi-coach support — single coach per deployment is the model
- Marketing landing page — next milestone after this
- Mobile app — web PWA only

## Context

- App is functionally complete but hasn't been thoroughly tested end-to-end recently
- Codebase mapping (`.planning/codebase/`) identified 382 lines of concerns including bugs, tech debt, security, and performance issues
- The CONCERNS.md flagged: silent error swallowing, missing JSON error handling, no retry logic, pagination gaps, fragile AI pipeline
- This is a brownfield milestone — all code exists, we're refining not building
- After this milestone: marketing landing page (separate project/milestone)
- Target audience for demo: potential coach buyers who need to see a polished product

## Constraints

- **Color change**: Primary swap only (orange/green → Royal Blue). Don't redesign components or layout.
- **No new features**: Only fix and polish what exists. Resist scope creep.
- **Both languages**: Every fix must work in English AND Arabic/RTL.
- **Demo-ready bar**: A coach walking through the app should see zero broken states, zero ugly screens, zero confusing flows.
- **Existing stack**: Next.js 16 / React 19 / Supabase / Tailwind v4 / shadcn/ui — no stack changes.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Royal Blue as primary color | User preference for rebrand | — Pending |
| Polish over new features | Get existing app solid before expanding | — Pending |
| Both languages equally | MENA market requires Arabic/RTL quality | — Pending |
| Demo-ready as done criteria | Next step is selling to coaches | — Pending |
| Skip test suite for now | Focus on visible UX, not infrastructure | — Pending |

---
*Last updated: 2026-02-12 after initialization*
