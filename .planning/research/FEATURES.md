# Hardening Feature Landscape

**Domain:** Next.js 16 + Supabase Application Refactoring
**Researched:** 2026-02-12

## Table Stakes

Features users expect in a production-ready app. Missing = product feels incomplete/broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Errors are logged and trackable | Production debugging is impossible without it | Low | Sentry already integrated, need to add context to all errors |
| API routes validate inputs | Prevents crashes from malformed requests | Medium | Add Zod schemas for all API route inputs |
| AI responses are validated | Prevents corrupt data from breaking UI | Medium | Add Zod schemas for meal/workout plan structures |
| Failed API calls retry automatically | External services are unreliable (network, rate limits) | Medium | Add exponential backoff wrapper for OpenRouter |
| Database queries are optimized | Slow queries = poor UX at scale | Medium | Parallelize independent queries, add indexes |
| Error messages are user-friendly | Generic "Something went wrong" frustrates users | Low | Return specific error states to UI components |
| Large components are maintainable | 600+ line components are impossible to debug/extend | High | Extract custom hooks, split into smaller components |

## Differentiators

Features that set a well-engineered product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Graceful degradation on external service failures | App works even if notifications/analytics fail | Low | Fire-and-forget non-critical operations |
| Error boundaries at route level | Isolated errors don't crash entire app | Low | Already have global, add per-route error.tsx |
| Comprehensive error context in Sentry | Debug production issues without user reproduction | Low | Add user ID, action, request ID to all errors |
| Server Components for data fetching | Faster page loads, smaller client bundles | Medium | Already using, formalize pattern (no data fetch in Client Components) |
| Progressive retry with backoff | Reduces API cost vs immediate retries | Low | Exponential delay prevents thundering herd |
| AI response validation with detailed errors | Debug why AI failed, improve prompts | Medium | Log full AI response + validation errors on failure |

## Anti-Features

Features to explicitly NOT build (avoid scope creep, unnecessary complexity).

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Client-side retry logic | Adds complexity, browser refresh loses context | Server-side retry only (OpenRouter wrapper) |
| Global error handler in middleware | Middleware should be lean (auth only), not error handling | Use error.tsx boundaries + API route try-catch |
| Caching layer (Redis) | Premature optimization for 1K users, adds infrastructure cost | Defer until 10K+ users, use Postgres caching first |
| Circuit breaker pattern | Overkill for current scale, adds complexity | Simple retry with max attempts sufficient for MVP |
| Custom error tracking | Sentry already handles this well | Enhance Sentry context, don't build custom solution |
| Real-time error notifications | Coach doesn't need instant alerts for every error | Daily/weekly Sentry digest emails sufficient |
| Automated error recovery | Too complex, many errors need manual investigation | Log + alert only, manual fix |

## Feature Dependencies

```
Zod Schemas (Foundation)
    ↓
AI Response Validation (depends on schemas)
    ↓
API Route Input Validation (depends on schemas)

Retry Utility (Foundation)
    ↓
OpenRouter Client Refactor (depends on retry)

Error Logging Patterns (Foundation)
    ↓
All other features (everything depends on proper error logging)

Supabase Query Optimization (Independent)
    ↓
Database SECURITY DEFINER Functions (depends on query analysis)
```

## MVP Recommendation

Prioritize in this order:

1. **Error logging with context** - Enables debugging everything else
2. **API route input validation** - Prevents immediate crashes from bad inputs
3. **AI response validation** - Prevents corrupt data from breaking app
4. **Retry logic for OpenRouter** - Makes AI generation reliable
5. **Parallel Supabase queries** - Biggest performance win for API routes
6. **Custom hook extraction** - Makes large components maintainable
7. **Database RLS optimization** - Defer until admin panel performance issues confirmed

Defer:

- **Circuit breaker pattern**: Not needed at 1K user scale
- **Caching layer**: Premature optimization, defer until 10K+ users
- **Automated error recovery**: Too complex, manual intervention sufficient

## Sources

- [Next.js Error Handling Documentation](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [Zod Documentation](https://zod.dev/)
- [Supabase Query Optimization](https://supabase.com/docs/guides/database/query-optimization)
- [React Component Refactoring Patterns](https://codescene.com/blog/refactoring-components-in-react-with-custom-hooks)
