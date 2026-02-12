# Hardening Domain Pitfalls

**Domain:** Next.js 16 + Supabase Refactoring
**Researched:** 2026-02-12

## Critical Pitfalls

### Pitfall 1: Silent Error Swallowing

**What goes wrong:** Try-catch blocks that log nothing or return null without context. Production errors disappear, users see broken UI, impossible to debug.

**Why it happens:** Developers add try-catch "just in case" without thinking through error handling strategy. Empty catch blocks seem harmless during development.

**Consequences:**
- Production bugs invisible until user reports
- No error context for debugging (which user? what action?)
- Sentry integration becomes useless
- Users blame the product, not a fixable bug

**Prevention:**
- ALWAYS log errors with context: `console.error("Operation failed:", { userId, action, error })`
- ALWAYS send to Sentry: `Sentry.captureException(error, { tags, user })`
- ALWAYS return error state to UI: `return { error: "User-friendly message" }`
- Code review checklist: "Does every catch block log and report?"

**Detection:**
- Search codebase for `catch {}` (empty catch)
- Search for `catch { return null }` (silent failure)
- Sentry showing zero errors in production = red flag (errors ARE happening, not being reported)

### Pitfall 2: Sequential Database Queries (Waterfall)

**What goes wrong:** Fetching profile, then assessment, then check-in with separate await calls. Each query waits for previous, multiplying latency.

**Why it happens:** Natural to write sequential code. Async/await looks synchronous, easy to forget you can parallelize.

**Consequences:**
- 3 queries × 50ms = 150ms vs 50ms parallel (3x slower)
- Scales linearly with query count (5 queries = 250ms vs 50ms)
- Mobile users on slow networks wait 500ms+ for API routes
- Poor Time to First Byte (TTFB) metrics

**Prevention:**
- Use `Promise.all([query1, query2, query3])` for independent queries
- Code review: "Can these queries run in parallel?"
- Measure API route latency in development (add timing logs)

**Detection:**
- API routes taking >200ms with multiple Supabase calls
- Multiple `await supabase.from()` statements in sequence
- Add timing: `console.time("fetch")` / `console.timeEnd("fetch")`

### Pitfall 3: Validating AI Responses with TypeScript Only

**What goes wrong:** Casting AI responses `as MealPlan` without runtime validation. AI returns malformed JSON, app crashes.

**Why it happens:** TypeScript gives false confidence. Types are compile-time only, disappear at runtime.

**Consequences:**
- AI returns `{ weeklyPlan: null }` instead of proper structure → crashes
- User sees "Something went wrong" with no recovery
- Can't debug what AI actually returned
- Database stores corrupt JSONB data

**Prevention:**
- ALWAYS validate AI responses with Zod before using
- Log validation failures with full AI response for debugging
- Use `safeParse()` not `parse()` to avoid throwing in production
- Prompt engineering: "Return ONLY valid JSON, no markdown"

**Detection:**
- Search for `as MealPlan` or `as any` after AI calls
- Sentry errors about "Cannot read property 'X' of undefined" in plan rendering
- Users reporting "plan not loading" (corrupt data in database)

### Pitfall 4: Blocking API Responses on Non-Critical Operations

**What goes wrong:** `await sendNotification()` before returning API response. Notification service down = API fails.

**Why it happens:** Natural to await everything. Don't distinguish critical vs nice-to-have operations.

**Consequences:**
- OneSignal timeout (5s) = user waits 5s for API response
- Third-party service down = entire feature broken
- Can't ship critical data because waiting for notifications
- Poor perceived performance (user action → response delay)

**Prevention:**
- Fire-and-forget: `Promise.resolve().then(() => sendNotification())`
- Don't await notification/analytics/logging operations
- Return API response immediately after critical operations (save to DB)
- Separate critical path from side effects

**Detection:**
- API routes with `await` calls to external services after database save
- Slow API responses when third-party services are down
- Check if removing notification code speeds up API

## Moderate Pitfalls

### Pitfall 5: Over-Indexing Without Analysis

**What goes wrong:** Adding indexes on every column "just in case". Slows down writes, increases storage, indexes not used.

**Why it happens:** "Indexes make queries fast" → add everywhere. Don't understand query planner.

**Prevention:**
- Run `EXPLAIN ANALYZE` on slow queries FIRST
- Add indexes only where sequential scans occur
- Use Supabase index_advisor extension
- Monitor write performance after adding indexes

### Pitfall 6: Large "use client" Components

**What goes wrong:** Adding `"use client"` to entire page component (500+ lines). Ships all code to browser, disables Server Component benefits.

**Why it happens:** Need `useState` somewhere in component → add "use client" at top. Don't think about composition.

**Prevention:**
- Keep Server Components as default
- Extract interactive parts to separate Client Components
- Use Server Components for data fetching, layouts
- Add "use client" only to leaf components

### Pitfall 7: Throwing Errors in Server Actions for Expected Errors

**What goes wrong:** Using `throw new Error("Title required")` for validation errors in Server Actions. Crashes instead of showing user-friendly message.

**Why it happens:** Old pattern from Pages Router. App Router has new paradigm.

**Prevention:**
- Return error objects: `return { error: "Title required" }`
- Use `useActionState` hook to handle errors
- Reserve `throw` for unexpected errors (database down)
- Read Next.js 16 error handling docs

### Pitfall 8: RLS Policies with Joins

**What goes wrong:** RLS policy with `EXISTS (SELECT ... JOIN ...)`. Runs join on EVERY ROW, extremely slow.

**Why it happens:** Writing RLS like application code. Forget RLS runs per-row.

**Prevention:**
- Move join logic to SECURITY DEFINER functions
- Use IN/ANY with arrays instead of joins
- Mark functions STABLE to enable caching
- Profile with EXPLAIN ANALYZE

## Minor Pitfalls

### Pitfall 9: Not Limiting Select Fields

**What goes wrong:** `.select("*")` fetches all columns including large JSONB. Wastes bandwidth.

**Prevention:** `.select("id,name,created_at")` only what you need

### Pitfall 10: Infinite Retry Loops

**What goes wrong:** Retry logic with no max attempts. 400 error retries forever.

**Prevention:**
- Set `maxAttempts` (default 3)
- Check `shouldRetry(error)` - don't retry 4xx errors
- Add exponential delay cap (`maxDelayMs`)

### Pitfall 11: No Error Context in Logs

**What goes wrong:** `console.error(error)` without userId, action, timestamp.

**Prevention:** `console.error("Action failed:", { userId, action, error, timestamp })`

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Foundation (Zod schemas) | Schemas too strict, reject valid AI responses | Start permissive (`.optional()`, `.nullable()`), tighten after testing |
| Service Layer (Retry) | Retrying non-idempotent operations | Only retry safe operations (GET, idempotent POST) |
| API Routes (Validation) | Validating everything, slow API routes | Validate external inputs only, trust internal data |
| Component Refactoring | Breaking hooks into too many pieces | Extract hooks for reuse, not for every 20 lines |
| Database (RLS) | SECURITY DEFINER function security leak | Functions callable from API - don't expose sensitive data |

## Sources

- [Next.js Error Handling Best Practices](https://devanddeliver.com/blog/frontend/next-js-15-error-handling-best-practices-for-code-and-routes)
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Common Sense Refactoring of a Messy React Component](https://alexkondov.com/refactoring-a-messy-react-component/)
- [Next.js Error Boundary Best Practices](https://www.dhiwise.com/post/nextjs-error-boundary-best-practices)
- [Supabase RLS using Functions - Security Definers](https://blog.entrostat.com/supabase-rls-functions/)
