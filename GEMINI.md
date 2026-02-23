## Project Overview

**FitFast** is an AI-powered fitness coaching PWA for the MENA region (Egypt). Single coach handoff, one instance only. Each coach instance serves 500-1000 clients.

**Business Model:** One-off sale to coaches. Must be easy to deploy and handoff to non-technical coaches.

## Monorepo Structure

```
fitfast/
├── apps/
│   ├── client/          # PWA — port 3000 (@fitfast/client)
│   └── admin/           # Coach panel — port 3001 (@fitfast/admin)
├── packages/
│   ├── ui/              # @fitfast/ui — shadcn components + design system
│   ├── i18n/            # @fitfast/i18n — routing + navigation
│   └── config/          # @fitfast/config — shared tsconfig + eslint
├── convex/              # Shared backend (both apps connect to same deployment)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json         # Root: turbo scripts only
```

## Tech Stack

- **Framework:** Next.js 16+ (App Router, Turbopack) with TypeScript
- **Database/Backend:** Convex (real-time, serverless)
- **Auth:** Clerk
- **AI:** OpenRouter API (DeepSeek V3 for plans, Qwen3-VL for OCR) via Vercel AI SDK
- **Styling:** TailwindCSS v4 + shadcn/ui (@fitfast/ui)
- **i18n:** next-intl (English + Arabic with RTL)
- **Forms:** React Hook Form + Zod
- **Monitoring:** Sentry
- **Deployment:** Vercel

## Development Commands

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Run both apps in parallel
pnpm dev:client           # Run client PWA only (port 3000)
pnpm dev:admin            # Run admin panel only (port 3001)
pnpm build                # Build both apps
pnpm type-check           # TypeScript check all packages
pnpm lint                 # Lint all packages

# Per-app commands
pnpm --filter @fitfast/client build
pnpm --filter @fitfast/admin build
```

## Key Architecture

### Convex as Shared Backend

- `convex/` stays at root — both apps import via tsconfig path alias `@/convex/*` → `../../convex/*`
- Convex handles auth internally via `useConvexAuth()` — hooks don't take userId
- Convex uses camelCase field names (NOT snake_case like old Supabase)
- Both apps share the same Convex deployment

### Internal Packages (Source-Level)

- `@fitfast/ui` — import individual components: `import { Button } from "@fitfast/ui/button"`
- `@fitfast/i18n` — shared routing/navigation: `import { Link } from "@fitfast/i18n/navigation"`
- `@fitfast/config` — shared tsconfig base + eslint
- No build step for packages — consuming app's bundler compiles them (`transpilePackages`)

### App Separation

- **Client PWA** (`apps/client/`): All client-facing pages, PWA features (ServiceWorker, OneSignal), mobile-first
- **Admin Panel** (`apps/admin/`): Coach dashboard, client management, tickets, settings
- Hooks are per-app (thin Convex query wrappers, not worth sharing)
- Translations are per-app (split for independence)

## Common Patterns

### Fetching Data (Client Component with Convex)

```typescript
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useMyData() {
  const { isAuthenticated } = useConvexAuth();
  const data = useQuery(api.myModule.myQuery, isAuthenticated ? {} : "skip");
  return {
    data: data ?? null,
    isLoading: isAuthenticated && data === undefined,
  };
}
```

### UI Components

```typescript
import { Button } from "@fitfast/ui/button";
import { Input } from "@fitfast/ui/input";
import { cn } from "@fitfast/ui/cn";
```

### i18n

```typescript
import { useTranslations } from "next-intl";
import { Link } from "@fitfast/i18n/navigation";

export function MyComponent() {
  const t = useTranslations("namespace");
  return <Link href="/page">{t("key")}</Link>;
}
```

## Critical Files

**Client App:**
- `apps/client/middleware.ts` — Clerk + next-intl routing
- `apps/client/src/lib/ai/` — AI plan generators (meal + workout)
- `apps/client/src/hooks/` — All Convex query hooks

**Admin App:**
- `apps/admin/middleware.ts` — Clerk + next-intl (coach-only)
- `apps/admin/src/app/[locale]/(panel)/` — Admin dashboard pages

**Shared Backend:**
- `convex/` — All Convex functions (queries, mutations, actions)

## AI Integration

- AI runs on check-in submission (not proactively)
- Uses OpenRouter (DeepSeek V3 ~$0.35/M tokens)
- Target: <$0.20 USD per client per month
- Retry up to 3 times on failure, log to Sentry
- Plans stored as flexible JSON in Convex

## Bilingual (EN + AR RTL)

- All UI strings via `next-intl`
- AI generates plans in user's selected language
- Tailwind RTL for automatic layout flipping
- Test both languages for every feature

## Important Notes

- **Deadline:** March 31, 2026
- **Check-in frequency:** Coach-defined globally (14-day cycles)
- **Communication:** Ticket system only (no real-time chat)
- **Payment verification:** OCR-assisted, coach manually approves
- Sentry for error monitoring in both apps
- PWA features (ServiceWorker, push notifications) are client-only
