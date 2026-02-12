# External Integrations

**Analysis Date:** 2026-02-12

## APIs & External Services

**AI/LLM:**
- OpenRouter API - LLM inference platform
  - Models used:
    - `deepseek/deepseek-chat` (DeepSeek V3) for meal and workout plan generation
    - `qwen/qwen2.5-vl-72b-instruct` (Qwen VL) for OCR of payment receipts
  - SDK/Client: Custom `OpenRouterClient` in `src/lib/ai/openrouter.ts`
  - Auth: `OPENROUTER_API_KEY` (server-only)
  - Endpoint: `https://openrouter.ai/api/v1/chat/completions`
  - Usage:
    - `src/lib/ai/meal-plan-generator.ts` - Generates meal plans with macros
    - `src/lib/ai/workout-plan-generator.ts` - Generates workout routines
    - `src/app/api/admin/ocr/route.ts` - Extracts payment data from screenshots

**Push Notifications:**
- OneSignal - Cross-platform push notification service
  - SDK/Client:
    - Client-side: `react-onesignal 3.4.6` for subscription + identity
    - Server-side: Custom `OneSignalClient` in `src/lib/onesignal.ts`
  - Auth:
    - Public: `NEXT_PUBLIC_ONESIGNAL_APP_ID` (client-side subscription)
    - Private: `ONESIGNAL_REST_API_KEY` (server-side sending)
  - Endpoint: `https://api.onesignal.com/notifications`
  - Usage:
    - `src/components/pwa/OneSignalProvider.tsx` - Initializes SDK and handles subscription
    - `src/components/pwa/OneSignalIdentity.tsx` - Links OneSignal user to Supabase ID
    - `src/app/api/admin/notifications/send/route.ts` - Coach sends notifications
    - Check-in reminders (triggered automatically every 14 days)

**Error Tracking & Monitoring:**
- Sentry - Error aggregation and performance monitoring
  - SDK: `@sentry/nextjs 10.38.0`
  - Auth: `NEXT_PUBLIC_SENTRY_DSN` (client), `SENTRY_DSN` (server), `SENTRY_ORG`, `SENTRY_PROJECT` (build)
  - Endpoints:
    - Client: Tunneled through `/monitoring` route to bypass ad-blockers
  - Configuration:
    - Client: `sentry.client.config.ts` - Traces 20% (tracesSampleRate: 0.2), Session Replay 1%
    - Server: `sentry.server.config.ts` - Traces 100% (tracesSampleRate: 1)
    - Edge: `sentry.edge.config.ts` - Traces 100%
    - Source maps deleted after upload, only enabled in production
  - Usage: Automatic error capture in Next.js App Router

## Data Storage

**Databases:**
- Supabase (PostgreSQL)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - Client libraries:
    - `@supabase/ssr 0.8.0` - Server/SSR auth helpers with cookie management
    - `@supabase/supabase-js 2.94.1` - JavaScript SDK for queries
  - Type generation: `src/types/database.ts` (auto-generated from schema)
  - Schema: `supabase/migrations/`
    - `001_initial_schema.sql` - Base tables (profiles, assessments, meal_plans, workout_plans, check_ins, tickets, pending_signups)
    - `002_add_is_coach_to_profiles.sql` - Coach role
    - `003_fix_coach_rls_recursion.sql` - SECURITY DEFINER function to prevent RLS recursion
    - `004_coach_rls_all_tables.sql` - Row-level security policies for coach access
    - `005_push_notifications.sql` - Push notification subscriptions table
  - Clients:
    - Server: `src/lib/supabase/server.ts` - `createClient()` (session-aware), `createAdminClient()` (bypasses RLS)
    - Browser: `src/lib/supabase/client.ts` - `createClient()` for CSR data fetching
  - RLS enabled on all tables - users see only their own data

**File Storage:**
- Supabase Storage (via postgres bucket)
  - Image optimization via: Supabase remote pattern in Next.js config
  - Hostname: `obxtcnygregnhbafsfsd.supabase.co`
  - Path: `/storage/v1/object/public/**`
  - Usage: User avatars, meal/workout plan images, receipt uploads for OCR

**Caching:**
- SWR 2.4.0 - Client-side HTTP cache with revalidation
- Service Worker - Offline caching for PWA (`public/sw.js`)
- No external cache service (Redis, Memcached) detected

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (PostgreSQL + built-in auth)
  - Implementation:
    - Email/magic link signup for clients
    - Email/password login for coaches
    - Session stored in cookies via `@supabase/ssr` middleware
  - Routes:
    - `src/app/[locale]/(auth)/login/page.tsx` - Email/password login
    - `src/app/[locale]/(auth)/magic-link/page.tsx` - Magic link signup
    - `src/app/[locale]/(auth)/set-password/page.tsx` - Password setup
    - `src/app/api/auth/callback/route.ts` - OAuth callback handler
    - `src/app/api/auth/sign-in/route.ts` - Sign-in endpoint
    - `src/app/api/auth/logout/route.ts` - Logout endpoint
  - Middleware: `src/middleware.ts` (via proxy.ts in Next.js 16) handles session refresh

**User Identity Linking:**
- OneSignal external_id - Maps OneSignal subscription to Supabase user.id
  - Implementation: `src/components/pwa/OneSignalIdentity.tsx` via `setExternalUserId()`

## Monitoring & Observability

**Error Tracking:**
- Sentry - All frontend and server errors automatically captured
  - Sampling: Client 20%, Server 100%, Session Replay 1%
  - Features: Error boundaries, source maps, user context

**Logs:**
- Console logging in development
- Sentry captures stack traces in production
- No external logging service (CloudWatch, Datadog) configured

## CI/CD & Deployment

**Hosting:**
- Vercel - Primary deployment platform
  - Auto-deployment on git push
  - Environment variables managed in Vercel dashboard

**CI Pipeline:**
- GitHub Actions (implied by Vercel integration)
- Pre-commit: ESLint via `pnpm lint`
- Build: `pnpm build` (Next.js with Sentry source map upload)

**Supabase Hosting:**
- Supabase Cloud - Managed PostgreSQL + Auth + Storage
  - Project: fitfast (already provisioned)
  - Migrations applied via `supabase/migrations/` directory

## Environment Configuration

**Required env vars (Development & Production):**

Public (safe to commit in build):
- `NEXT_PUBLIC_SUPABASE_URL` - e.g., `https://yourproject.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous (limited RLS)
- `NEXT_PUBLIC_SENTRY_DSN` - Error tracking endpoint
- `NEXT_PUBLIC_APP_URL` - Application URL (defaults to localhost:3000)
- `NEXT_PUBLIC_CHECK_IN_FREQUENCY_DAYS` - Default: 14 (coach can override per client)
- `NEXT_PUBLIC_ONESIGNAL_APP_ID` - OneSignal app identifier

Private (must be in `.env.local` or Vercel secrets):
- `OPENROUTER_API_KEY` - OpenRouter API key (server-only)
- `ONESIGNAL_REST_API_KEY` - OneSignal REST API (server-only notifications)
- `SUPABASE_SERVICE_ROLE_KEY` - Admin bypass key (server-only, never expose)
- `SENTRY_DSN` - Server-side Sentry DSN
- `SENTRY_ORG` - Sentry organization (build-time)
- `SENTRY_PROJECT` - Sentry project (build-time)

**Secrets location:**
- Development: `.env.local` (in `.gitignore`)
- Production: Vercel Environment Variables dashboard
- Reference: `.env.example` in repo (public template)

## Webhooks & Callbacks

**Incoming:**
- Supabase Auth callbacks:
  - `src/app/api/auth/callback/route.ts` - Handles OAuth redirects
  - Magic link verification (via Supabase-managed email)

**Outgoing:**
- OneSignal - Push notifications sent from:
  - `src/app/api/plans/meal/route.ts` - On meal plan generation
  - `src/app/api/plans/workout/route.ts` - On workout plan generation
  - `src/app/api/admin/notifications/send/route.ts` - Coach-initiated broadcast
  - Scheduled check-in reminders (via cron job, not configured in code)

## API Routes (Server Integration Points)

**Authentication:**
- `POST /api/auth/sign-in` - Email/password login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/callback` - OAuth callback
- `GET /api/auth/profile` - Current user profile

**AI Generation:**
- `POST /api/plans/meal` - Generate meal plan (calls OpenRouter + OneSignal)
- `POST /api/plans/workout` - Generate workout plan (calls OpenRouter + OneSignal)

**Admin (Coach Only):**
- `POST /api/admin/ocr` - OCR receipt verification (calls OpenRouter)
- `POST /api/admin/approve-signup` - Approve pending client signup
- `POST /api/admin/notifications/send` - Send push notification (calls OneSignal)

**Configuration:**
- `GET /api/config/pricing` - Pricing tiers

**User Data:**
- `POST /api/tickets` - Submit support ticket

---

*Integration audit: 2026-02-12*
