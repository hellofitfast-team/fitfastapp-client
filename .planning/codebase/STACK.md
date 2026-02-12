# Technology Stack

**Analysis Date:** 2026-02-12

## Languages

**Primary:**
- TypeScript 5.9.3 - All source code, strict mode enabled
- JSX/TSX - React component syntax

**Secondary:**
- SQL - Supabase schema migrations in `supabase/migrations/`
- JavaScript - Configuration files and public assets

## Runtime

**Environment:**
- Node.js (version not specified in project, see `.node-version` if present)
- Next.js 16.1.6 with App Router

**Package Manager:**
- pnpm (implicit from project structure, no version lock file pattern seen)
- Lockfile: Present (pnpm-lock.yaml implied)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework with App Router
- React 19.2.3 - UI library with Concurrent features
- TypeScript 5.9.3 - Static typing

**Routing & i18n:**
- next-intl 4.8.2 - Bilingual support (English + Arabic with RTL)
- Middleware at `src/middleware.ts` for auth + locale routing

**Styling:**
- TailwindCSS 4.1.18 - Utility-first CSS
- @tailwindcss/postcss 4.1.18 - Tailwind v4 PostCSS plugin
- tailwindcss-rtl 0.9.0 - Automatic RTL layout flipping for Arabic

**UI Components:**
- shadcn/ui (via Radix UI primitives)
  - @radix-ui/react-dialog 1.1.15
  - @radix-ui/react-dropdown-menu 2.1.16
  - @radix-ui/react-label 2.1.8
  - @radix-ui/react-select 2.2.6
  - @radix-ui/react-separator 1.1.8
  - @radix-ui/react-slider 1.3.6
  - @radix-ui/react-tabs 1.1.13
  - @radix-ui/react-switch 1.2.6
  - @radix-ui/react-toast 1.2.15

**Forms & Validation:**
- React Hook Form 7.71.1 - Form state management
- @hookform/resolvers 5.2.2 - RHF resolver integration
- Zod 4.3.6 - TypeScript-first schema validation

**State Management:**
- SWR 2.4.0 - Server state fetching with caching
- Zustand (listed in CLAUDE.md, not found in package.json - may be pending removal or already integrated)

**Charting:**
- recharts 3.7.0 - Composable React charts library
- Optimized for bundle inclusion via `optimizePackageImports`

**Icons:**
- lucide-react 0.563.0 - SVG icon library
- Optimized for bundle inclusion via `optimizePackageImports`

**Utilities:**
- clsx 2.1.1 - Conditional class name utility
- class-variance-authority 0.7.1 - Type-safe component variant creation
- tailwind-merge 3.4.0 - Merge Tailwind class conflicts

## Key Dependencies

**Critical (Business Logic):**
- @supabase/ssr 0.8.0 - Supabase SSR auth helpers (cookie handling)
- @supabase/supabase-js 2.94.1 - Supabase client SDK
- react-onesignal 3.4.6 - OneSignal push notification SDK
- @sentry/nextjs 10.38.0 - Error tracking and monitoring

**Infrastructure:**
- next 16.1.6 - Framework engine
- react, react-dom 19.2.3 - React library

## Configuration

**Environment:**
- Environment variables loaded via `.env.local` (development) and deployment platform (Vercel)

**Required env vars (public):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project endpoint
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry error tracking DSN
- `NEXT_PUBLIC_APP_URL` - Application URL for referrer header (defaults to localhost:3000)
- `NEXT_PUBLIC_CHECK_IN_FREQUENCY_DAYS` - Coach-defined check-in interval (default: 14)
- `NEXT_PUBLIC_ONESIGNAL_APP_ID` - OneSignal app ID for push notifications

**Required env vars (server/secret):**
- `OPENROUTER_API_KEY` - OpenRouter API key for AI models
- `ONESIGNAL_REST_API_KEY` - OneSignal REST API key (server-side notifications)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin client (bypasses RLS, server-only)
- `SENTRY_DSN` - Server-side Sentry DSN
- `SENTRY_ORG` - Sentry organization slug (build-time)
- `SENTRY_PROJECT` - Sentry project slug (build-time)

**Build:**
- Config files:
  - `next.config.ts` - Next.js configuration with Sentry and next-intl integration
  - `tsconfig.json` - TypeScript compiler options (target: ES2017)
  - `postcss.config.mjs` - PostCSS pipeline for Tailwind v4
  - `eslint.config.mjs` - ESLint rules (extends next/core-web-vitals)
  - Sentry config: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`

## Platform Requirements

**Development:**
- Node.js (version unspecified, assume LTS or 18+)
- pnpm package manager
- TypeScript 5.9.3
- ESLint 9.39.2

**Production:**
- Vercel (primary deployment target per CLAUDE.md)
- Supabase Cloud (PostgreSQL + Auth + Storage)
- OpenRouter API (for AI)
- OneSignal (for push notifications)
- Sentry (for error tracking)

**Browser Support:**
- Modern browsers with PWA support (Service Workers, IndexedDB)
- Bilingual support: English and Arabic (RTL-aware)

## Build & Dev Commands

```bash
pnpm dev              # Development server with Turbopack
pnpm build            # Production build with source maps for Sentry
pnpm start            # Start production server locally
pnpm lint             # Run ESLint
pnpm type-check       # TypeScript type checking only
```

## Special Configurations

**PWA (Progressive Web App):**
- Service Worker: `public/sw.js`
- Manifest: `public/manifest.json` (standalone display mode)
- OneSignal workers: `public/OneSignalSDKWorker.js`, `public/OneSignalSDKUpdaterWorker.js`
- Offline fallback: `public/offline.html`
- Icons: Multiple sizes in `public/icons/` with maskable variant

**Next.js Features:**
- Turbopack enabled in dev (`--turbopack` flag)
- Image optimization with Supabase remote pattern configured
- Security headers configured (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
- Service Worker caching headers (no-cache for SDK workers)

**TypeScript:**
- Path alias: `@/*` → `./src/*`
- Strict mode enabled
- Module resolution: bundler
- Target: ES2017
- Isolated modules for faster build

---

*Stack analysis: 2026-02-12*
