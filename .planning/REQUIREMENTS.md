# Requirements: FitFast — Polish & Rebrand

**Defined:** 2026-02-12
**Core Value:** Every user flow works reliably, looks polished, and feels consistent in both languages

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Theme Rebrand

- [ ] **THEME-01**: Primary and accent CSS custom properties swapped from orange/green to Royal Blue HSL values in globals.css
- [ ] **THEME-02**: New Royal Blue palette passes WCAG AA contrast ratio (4.5:1 text, 3:1 UI) against all backgrounds
- [ ] **THEME-03**: PWA manifest theme_color and all related meta tags updated to Royal Blue

### Reliability

- [ ] **RELY-01**: All JSON.parse calls wrapped in try-catch with Sentry error logging (AI pipeline, OCR, config)
- [ ] **RELY-02**: OpenRouter API calls retry up to 3 times with exponential backoff (1s/2s/4s)
- [ ] **RELY-03**: All silent .catch(() => {}) patterns replaced with Sentry logging and appropriate user feedback
- [ ] **RELY-04**: AI-generated meal and workout plan output validated with Zod schema before database save
- [ ] **RELY-05**: User sees clear warning message when plan generation fails (not silent failure)

### UX Polish

- [ ] **UX-01**: All pages show consistent skeleton/loading states during data fetch
- [ ] **UX-02**: All "no data" scenarios display designed empty states with guidance (no plans yet, no tickets, etc.)
- [ ] **UX-03**: All forms use inline validation on blur with clear error messages
- [ ] **UX-04**: All interactive elements meet 48x48px minimum touch target size for mobile PWA

### Performance

- [ ] **PERF-01**: Check-in page fetches profile, assessment, and lock status in parallel (Promise.all) instead of sequentially
- [ ] **PERF-02**: Admin clients list is paginated (supports 1000+ clients without performance degradation)
- [ ] **PERF-03**: Progress charts have date range filter (last 30 / 90 / all days)

### Arabic/RTL

- [ ] **RTL-01**: All pages audited in Arabic locale with layout breaks identified and fixed
- [ ] **RTL-02**: Progress bars and directional UI elements respect RTL (fill right-to-left in Arabic)
- [ ] **RTL-03**: Numbers and dates formatted with proper locale-aware formatting in both languages
- [ ] **RTL-04**: All translation keys audited — no missing keys, no raw fallback text visible

### Admin/Coach Polish

- [ ] **ADMIN-01**: OneSignal initialization failures surfaced to user (disabled notification UI + info message) and logged to Sentry
- [ ] **ADMIN-02**: OCR extracted data validated with Zod schema before storage in database
- [ ] **ADMIN-03**: Settings page errors shown to user via toast and logged to Sentry (no silent swallowing)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Theme Enhancements

- **THEME-04**: Audit and replace all hardcoded Tailwind color classes (orange-*, green-*) across components
- **THEME-05**: Generate complementary secondary/accent palette derived from Royal Blue
- **THEME-06**: Future-proof CSS variables for dark mode support

### UX Enhancements

- **UX-05**: Retry button on failed plan generation for user self-service recovery
- **UX-06**: Toast notifications for all recoverable errors
- **UX-07**: Optimistic UI updates on form submissions
- **UX-08**: Success celebrations on plan generation completion

### Performance Enhancements

- **PERF-04**: Consolidate check-in lock check into single Supabase SQL function

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| New features (token dashboard, plan versioning) | Future milestone — this is polish only |
| Test suite creation | Separate effort, not blocking demo-readiness |
| Type system cleanup (as any/never casts) | Infrastructure debt, not visible to demo audience |
| Multi-coach support | Architecture decision: single coach per deployment |
| Marketing landing page | Next milestone after this one |
| Mobile native app | Web PWA only for foreseeable future |
| Dark mode | Not needed for demo; future-proof variables deferred to v2 |
| Real-time features | High complexity, not core to demo value |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| THEME-01 | Phase 1 | Pending |
| THEME-02 | Phase 1 | Pending |
| THEME-03 | Phase 1 | Pending |
| RELY-01 | Phase 3, Phase 4 | Pending |
| RELY-02 | Phase 4 | Pending |
| RELY-03 | Phase 5 | Pending |
| RELY-04 | Phase 4 | Pending |
| RELY-05 | Phase 5 | Pending |
| UX-01 | Phase 6 | Pending |
| UX-02 | Phase 6 | Pending |
| UX-03 | Phase 6 | Pending |
| UX-04 | Phase 6 | Pending |
| PERF-01 | Phase 5 | Pending |
| PERF-02 | Phase 7 | Pending |
| PERF-03 | Phase 7 | Pending |
| RTL-01 | Phase 10 | Pending |
| RTL-02 | Phase 10 | Pending |
| RTL-03 | Phase 10 | Pending |
| RTL-04 | Phase 10 | Pending |
| ADMIN-01 | Phase 9 | Pending |
| ADMIN-02 | Phase 5 | Pending |
| ADMIN-03 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-02-12*
*Last updated: 2026-02-12 after roadmap creation*
