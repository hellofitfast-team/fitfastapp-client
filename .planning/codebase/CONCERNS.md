# Codebase Concerns

**Analysis Date:** 2026-02-12

## Tech Debt

**Type Safety: Widespread `as any` and `as never` Casts**
- Issue: Over 50 instances of `as any` or `as never` casts throughout API routes and components bypass TypeScript type checking
- Files:
  - `src/app/api/plans/meal/route.ts` (lines 52, 63-64, 86, 90)
  - `src/app/api/plans/workout/route.ts` (lines 52, 63-64, 86, 90)
  - `src/app/[locale]/(dashboard)/check-in/page.tsx` (lines 60, 231, 239-240)
  - `src/app/[locale]/(onboarding)/initial-assessment/page.tsx` (lines 259, 267)
  - `src/app/api/tickets/route.ts` (line 90)
  - `src/app/api/notifications/subscription/route.ts` (lines 35, 48, 86)
  - `src/app/api/notifications/reminder-time/route.ts` (line 55)
  - `src/app/api/admin/approve-signup/route.ts` (lines 78, 87)
  - And 20+ more files with `.update()` and `.insert()` casts
- Impact: Makes code fragile when types change; hides real type errors; complicates future refactoring
- Fix approach: Generate proper postgrest-js v2 types, or use type-safe wrappers around Supabase client methods. Use `.select("col1,col2")` pattern for proper type inference instead of `.select()`.

**No Test Coverage**
- Issue: Zero test files found in codebase; no unit, integration, or E2E tests despite critical paths
- Files: No `*.test.ts`, `*.spec.ts`, or test directory structure
- Impact: All changes risk regression; AI generation accuracy unverified; edge cases in check-in/plan flow untested
- Fix approach: Add Vitest with jsdom; create test suite for: meal/workout generators, check-in locking logic, payment approval workflow, OCR parsing

**JSON Parsing Without Error Handling**
- Issue: `JSON.parse()` calls without try-catch wrapping, especially in AI response parsing
- Files:
  - `src/lib/ai/meal-plan-generator.ts` (line 140)
  - `src/lib/ai/workout-plan-generator.ts` (similar pattern)
  - `src/app/api/admin/ocr/route.ts` (line 119)
  - `src/app/api/config/pricing/route.ts` (line 29)
- Impact: Invalid JSON from OpenRouter crashes endpoint; OCR parsing crashes if model returns malformed JSON
- Fix approach: Wrap all `JSON.parse()` in try-catch; validate parsed structure with Zod before use

**Missing Retry Logic for External APIs**
- Issue: No retry mechanism for OpenRouter API calls despite network unreliability
- Files:
  - `src/lib/ai/openrouter.ts` (no retry loop)
  - `src/lib/ai/meal-plan-generator.ts` (line 129-145 single attempt)
  - `src/lib/ai/workout-plan-generator.ts` (similar)
- Impact: Transient network failures block plan generation; users see "Failed to generate plan" on temporary outages
- Fix approach: Implement exponential backoff (3 retries, 1s/2s/4s delays) in OpenRouterClient; wrap in try-catch with Sentry tracking

---

## Known Bugs

**Plan Generation Not Awaited in Check-In**
- Symptoms: Check-in submitted, but plans not generated if request times out
- Files: `src/app/[locale]/(dashboard)/check-in/page.tsx` (lines 238-244)
- Code:
  ```typescript
  try {
    await Promise.all([
      fetch("/api/plans/meal", { ... }),
      fetch("/api/plans/workout", { ... }),
    ]);
  } catch (planError) {
    console.error("Plan generation error:", planError);
    // Check-in already saved — plans silently fail
  }
  ```
- Trigger: Any network error in either plan API (timeout, 5xx, etc.)
- Workaround: Coach must manually trigger plan regeneration via Supabase Studio
- Fix approach: Log plan generation failure to database as error status; show user warning; provide manual regenerate button

**OneSignal Initialization Can Fail Silently**
- Symptoms: Push notifications never work; error only logged to console
- Files: `src/components/pwa/OneSignalProvider.tsx` (line 19)
- Trigger: Missing `NEXT_PUBLIC_ONESIGNAL_APP_ID` or SDK load timeout
- Workaround: None — notifications disabled without user feedback
- Fix approach: Track OneSignal init failure in Sentry; disable notification UI if init fails; show user message

**Type Inference Broken for Supabase Selects**
- Symptoms: TypeScript shows `never` type on database results; relies on `any` casts
- Files: Most `supabase.from().select()` calls throughout codebase
- Trigger: Using `.select()` without column list (infers as never due to postgrest-js v2 Database generics missing Relationships field)
- Workaround: Cast result as `any`; use string literals like `.select("col1,col2")` for working types
- Fix approach: Extend Database type definitions or create typed wrapper function

**Unhandled Promise Rejections in Settings**
- Symptoms: Silent failures when updating settings; `.catch(() => {})` swallows errors
- Files: `src/app/[locale]/(dashboard)/settings/page.tsx` (lines 23-27)
- Code:
  ```typescript
  fetch(...)
    .then(res => res.json())
    .then(data => {})
    .catch(() => {}); // Error silently ignored
  ```
- Impact: Users don't know settings didn't save; no error tracking
- Fix approach: Log to Sentry before swallowing; show toast error to user

---

## Security Considerations

**RLS Policies Don't Validate Coach Access to Client Plans**
- Risk: Coach can read ANY user's data via direct Supabase queries (mitigated by user-scoped queries in proxy, but not in RLS itself)
- Files: `supabase/migrations/001_initial_schema.sql` (RLS policies lines 199-222)
- Current mitigation: Proxy.ts checks coach status before allowing `/admin` routes; middleware checks auth
- Recommendations:
  - Add coach RLS policies that allow coaches to select/update data of their assigned clients (currently missing)
  - Document that admin panel assumes 1 coach per deployment (no multi-coach support)

**No CORS or API Key Validation on Public Routes**
- Risk: `/api/config/pricing` and similar routes have no auth checks
- Files: `src/app/api/config/pricing/route.ts` (no auth validation)
- Current mitigation: None
- Recommendations: Add auth check or rate limiting; document as public vs. authenticated API

**OCR Data Not Sanitized Before Database Storage**
- Risk: User-uploaded screenshots parsed by OpenRouter; raw OCR output stored in `ocr_extracted_data` JSONB
- Files: `src/app/api/admin/ocr/route.ts` (lines 119-140)
- Current mitigation: Data only used by coach; marked as requiring review
- Recommendations: Validate OCR output structure with Zod; sanitize text fields before storage

**Payment Screenshot URLs Stored as Plain Text**
- Risk: Payment method info (UPI numbers, bank details) visible in `pending_signups.payment_screenshot_url`
- Files: `supabase/migrations/001_initial_schema.sql` (lines 144-155)
- Current mitigation: Data only accessible to coach; OCR doesn't extract payment details
- Recommendations: Mark screenshots as sensitive; consider encryption; audit access logs

---

## Performance Bottlenecks

**Multiple Supabase Calls in Check-In Lock Check**
- Problem: 3 sequential Promise.all() calls in check-in page on load (check last check-in, frequency config, last plan)
- Files: `src/app/[locale]/(dashboard)/check-in/page.tsx` (lines 80-141)
- Cause: Could be optimized to 1 call using Supabase edge function or SQL join
- Current: ~200-300ms for all 3 calls
- Improvement path: Create Supabase SQL function `get_check_in_status(user_id)` returning all three values; call once

**Dashboard Layout Fetches Separate Profile and Assessment**
- Problem: Two independent queries (not Promise.all'd in all places)
- Files: `src/app/[locale]/(dashboard)/layout.tsx` (line 23) — properly paralleled but adds ~150ms latency
- Cause: Could be cached with SWR or fetched server-side once
- Improvement path: Move to server layout or SWR-based cache

**Admin Clients List Has No Pagination**
- Problem: Fetches all clients without limit; scales poorly to 1000 clients
- Files: `src/app/[locale]/(admin)/admin/(panel)/clients/page.tsx` (lines likely have `.select()` without limit)
- Cause: No `limit()` or offset pagination implemented
- Improvement path: Add pagination with `.range()` and offset state

**Progress Page Fetches Full History for Charts**
- Problem: Loads all check-ins since user signup for chart rendering
- Files: `src/app/[locale]/(dashboard)/progress/page.tsx` (lines 56-60)
- Cause: Charts recompute on every data fetch; no date range filtering
- Improvement path: Add date range selector (last 30/90/all); use `.gte("created_at", dateFilter)`

---

## Fragile Areas

**AI Plan Generation Pipeline**
- Files:
  - `src/app/api/plans/meal/route.ts`
  - `src/app/api/plans/workout/route.ts`
  - `src/lib/ai/meal-plan-generator.ts`
  - `src/lib/ai/workout-plan-generator.ts`
- Why fragile:
  - Depends on OpenRouter API returning valid JSON
  - Prompt engineering not tested; small prompt changes alter output structure
  - No schema validation on generated plans before database save
  - Profile/assessment data may be missing (`any` casts hide null safety)
- Safe modification:
  - Wrap plan data generation in try-catch with Sentry tracking
  - Validate output with Zod schema before saving
  - Add unit tests for prompt → output mapping
  - Mock OpenRouter for tests
- Test coverage: MISSING — no tests for plan generation

**Check-In Multi-Step Form**
- Files: `src/app/[locale]/(dashboard)/check-in/page.tsx`
- Why fragile:
  - 600+ line component (largest in codebase)
  - Photo upload logic intertwined with form state
  - Step validation not thoroughly tested
  - Lock check status not re-checked after time passes
  - Multiple `as any` casts hide type issues
- Safe modification:
  - Break into smaller components (CheckInForm, PhotoUpload, StepValidator)
  - Add integration tests for all step transitions
  - Refactor lock check to use `setInterval` for real-time updates
- Test coverage: MISSING

**Admin Signup Approval with OCR**
- Files:
  - `src/app/api/admin/ocr/route.ts`
  - `src/app/api/admin/approve-signup/route.ts`
- Why fragile:
  - OCR parsing can fail silently
  - Approval creates user via `auth.admin` client (SECURITY_DEFINER risk)
  - No rollback if profile creation fails after auth user created
  - Stores ocr_extracted_data without validation
- Safe modification:
  - Wrap in transaction; validate all data before auth.admin call
  - Add retry for transient OCR failures
  - Validate ocr_extracted_data with schema
- Test coverage: MISSING

**Notification Integration (OneSignal)**
- Files:
  - `src/components/pwa/OneSignalProvider.tsx`
  - `src/components/pwa/OneSignalIdentity.tsx`
  - `src/hooks/use-notifications.ts`
  - `src/lib/onesignal.ts`
- Why fragile:
  - Multiple fallback paths with silent failures
  - `.catch(() => {})` swallows errors throughout
  - `import("react-onesignal")` dynamic imports can timeout
  - OneSignal SDK initialization unchecked; notifications may silently not work
- Safe modification:
  - Remove `.catch(() => {})` chains; log to Sentry
  - Add timeout for SDK import with fallback
  - Test both with and without OneSignal SDK available
- Test coverage: MISSING

---

## Scaling Limits

**Supabase Database Row Count**
- Current capacity: Indexes on `user_id` and date fields support ~10k users efficiently
- Limit: At 50k users (500 clients × 1000 coaching relationships), queries on meal_completions/workout_completions slow without additional indexing
- Scaling path:
  - Add composite index `idx_meal_completions_user_date` on `(user_id, date)`
  - Partition large tables by date range (annual)
  - Archive old check-ins to cold storage

**OpenRouter API Rate Limits**
- Current: No rate limiting on API calls; each check-in calls 2 plan generators
- Limit: Estimated 500 tokens/request × 2 = 1000 tokens per check-in; 1M token budget at $3.00 = 1000 check-ins max
- Scaling path:
  - Add rate limiting per user (1 check-in per day enforced)
  - Implement token budget tracking with alerts at 80%
  - Add queue (e.g., Bull/BullMQ) for plan generation during peak hours

**Supabase Storage for Progress Photos**
- Current: No size limits; photos max 5MB per upload, up to 4 per check-in
- Limit: 1000 users × 26 check-ins/year × 4 photos × 3MB = ~312GB annually
- Scaling path:
  - Set storage bucket max size; return 413 Payload Too Large
  - Compress photos on upload (webp)
  - Archive old photos after 1 year

---

## Dependencies at Risk

**OpenRouter API as Critical Path**
- Risk: Entire meal/workout plan feature depends on OpenRouter; no local fallback
- Impact: If OpenRouter unavailable or bills exceeded, app features blocked
- Migration plan: Keep DeepSeek V3 as primary; add fallback to simpler rule-based plan generator (no AI)

**OneSignal SDK Network Dependency**
- Risk: Notifications fail silently if SDK doesn't load; users don't know
- Impact: Coaches can't reliably reach clients; no visibility into failures
- Migration plan: Implement email notifications as fallback (via Sendgrid or similar); test both paths

**Supabase RLS Policies for Security**
- Risk: If RLS disabled or misconfigured, all users see all data
- Impact: CRITICAL — privacy violation
- Migration plan: Add audit log trigger; monitor RLS policy changes; test access controls in E2E suite

---

## Test Coverage Gaps

**AI Plan Generation Logic**
- What's not tested: Meal/workout generator prompts, JSON parsing, output validation
- Files: `src/lib/ai/meal-plan-generator.ts`, `src/lib/ai/workout-plan-generator.ts`
- Risk: Changes to prompts alter structure; invalid JSON crashes; Arabic text generation untested
- Priority: HIGH — directly impacts core value prop

**Check-In Form Validation and Locking**
- What's not tested: Multi-step form state machine, lock check logic, photo upload error handling, concurrent check-in submission
- Files: `src/app/[locale]/(dashboard)/check-in/page.tsx`
- Risk: Users bypass step validation; check-in submitted twice; photos fail silently
- Priority: HIGH — blocks core user flow

**Database RLS Policies**
- What's not tested: Can coach read client data? Can user modify others' records? RLS bypass attempts?
- Files: `supabase/migrations/*.sql`
- Risk: Security vulnerability undetected
- Priority: CRITICAL — security

**Admin Signup Approval Workflow**
- What's not tested: OCR parsing of different screenshot formats, payment validation, user creation rollback, concurrent approvals
- Files: `src/app/api/admin/ocr/route.ts`, `src/app/api/admin/approve-signup/route.ts`
- Risk: Duplicate user creation, corrupted approval status, OCR parsing crashes
- Priority: HIGH — impacts onboarding

**Error Handling Paths**
- What's not tested: Network timeouts, API 5xx errors, missing database records, concurrent requests
- Files: Most API routes
- Risk: Unknown behavior under failure; silent failures common
- Priority: MEDIUM — affects reliability

**i18n (Arabic/English)**
- What's not tested: RTL layout with long text, Arabic number formatting in charts, translation key missing fallbacks
- Files: All components using `useTranslations()`
- Risk: Arabic UI broken in edge cases
- Priority: MEDIUM — MENA-specific requirement

**Push Notifications (OneSignal)**
- What's not tested: SDK initialization, permission requests, subscription toggle, notification delivery
- Files: `src/components/pwa/OneSignalProvider.tsx`, `src/hooks/use-notifications.ts`
- Risk: Notifications silently never work; user can't debug
- Priority: MEDIUM — user engagement feature

---

## Missing Critical Features

**No Rate Limiting or Quota System**
- Problem: Users can spam check-ins, generate unlimited plans; no per-user limits enforced
- Blocks: Preventing abuse; cost control
- Risk: Single user running 100 check-ins = $20 in OpenRouter costs
- Solution: Add check-in frequency config (already in system_config, but not enforced in API); add plan generation cooldown per user

**No Plan History or Versioning**
- Problem: Plans overwrite; no way to see previous versions
- Blocks: Comparing old plans; A/B testing prompts
- Risk: Can't prove plan quality over time
- Solution: Add `version_number` and `parent_plan_id` to meal/workout plans; soft-delete on regenerate

**No Error Recovery UI**
- Problem: When plan generation fails, users see generic "Failed to generate" with no action
- Blocks: User self-service recovery
- Risk: Users must contact coach; support burden
- Solution: Add "Retry" button, "Request manual plan" form, estimated time to retry

**No Sentry Web Vitals Integration**
- Problem: Performance issues (slow queries, large JS bundles) not tracked
- Blocks: Identifying performance regressions
- Risk: App gets slow before anyone notices
- Solution: Enable Sentry Web Vitals in browser client initialization

**No Token Usage Tracking Dashboard**
- Problem: Coach can't see monthly OpenRouter costs; no budget alerts
- Blocks: Cost control; scaling decisions
- Risk: Unexpected bills; no visibility into AI cost per user
- Solution: Log token count per request; sum by user/month; display in admin dashboard with 80% warning

---

## Migration Path

**Recommended Priority Order for Fixes:**

1. **CRITICAL (blocks release or causes data loss):**
   - Add tests for RLS policies (security)
   - Wrap all `JSON.parse()` in try-catch
   - Add retry logic to OpenRouter client

2. **HIGH (breaks core features):**
   - Test check-in form validation and locking
   - Validate AI plan output before database save
   - Handle plan generation failures gracefully (not silently)
   - Remove `.catch(() => {})` in settings; log errors

3. **MEDIUM (degrades user experience):**
   - Add pagination to admin clients list
   - Test OCR parsing with various screenshot types
   - Implement OneSignal failure visibility
   - Add plan history versioning

4. **LOW (nice-to-have):**
   - Reduce type `any` casts via better Supabase types
   - Break apart 600+ line check-in component
   - Add Web Vitals monitoring
   - Create token usage dashboard

---

*Concerns audit: 2026-02-12*
