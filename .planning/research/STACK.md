# Technology Stack for Hardening

**Project:** FitFast PWA Hardening
**Researched:** 2026-02-12

## Recommended Stack Additions

### Validation Library
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zod | ^3.23+ | Runtime validation of AI responses and API inputs | Type-safe schemas, safeParse for error handling, integrates with TypeScript inference |

### Retry/Resilience
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Custom retry utility | N/A | Exponential backoff for OpenRouter API calls | Zero dependencies, full control over retry logic, lightweight (~50 lines) |

### Error Monitoring (Already in Stack)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Sentry | ^10.38 | Already integrated, enhance with structured error contexts | Production error tracking, already configured |

## Existing Stack (No Changes)

### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 16.1.6 | App Router, Server/Client Components | Latest stable, React 19 support, optimal for hardening patterns |
| React | 19 | Component rendering | Required by Next.js 16, stable Server Components |
| TypeScript | 5.x | Type safety | Already in stack, Zod enhances with runtime validation |

### Database/Auth
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase | Latest | PostgreSQL + Auth + RLS | Already in stack, optimization focuses on RLS patterns |

### AI
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| OpenRouter | Latest | DeepSeek V3 API | Already in stack, adding retry wrapper for reliability |

### Styling
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| TailwindCSS | v4 | Styling | Already in stack, no changes needed |
| shadcn/ui | Latest | Component library | Already in stack, no changes needed |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Validation | Zod | Yup | Zod has better TypeScript integration and smaller bundle size |
| Validation | Zod | io-ts | Zod has simpler API and better DX |
| Retry Logic | Custom utility | exponential-backoff npm | Custom implementation is 50 lines, no external dependency, full control |
| Retry Logic | Custom utility | p-retry npm | Overkill for current needs, custom is sufficient |
| Error Tracking | Sentry (keep) | LogRocket | Already using Sentry, no need to switch |

## Installation

```bash
# Core additions
pnpm add zod

# No other packages needed - retry utility is custom implementation
```

## Sources

- [Zod Official Documentation](https://zod.dev/)
- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Supabase Query Optimization Guide](https://supabase.com/docs/guides/database/query-optimization)
- [Exponential Backoff Pattern Research](https://advancedweb.hu/how-to-implement-an-exponential-backoff-retry-strategy-in-javascript/)
