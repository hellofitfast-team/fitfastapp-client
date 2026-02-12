# Architecture

**Analysis Date:** 2026-02-12

## Pattern Overview

**Overall:** Next.js 16+ server-centric MPA with route groups, middleware-driven auth, i18n routing, and API-driven state management.

**Key Characteristics:**
- Multi-route-group architecture: `(auth)`, `(onboarding)`, `(dashboard)`, `(admin)` with locale-parameterized root
- Server Components as default; client Components only for interactive UI and state management
- Edge middleware (`proxy.ts`) handles auth validation, role-based access, and i18n routing
- API routes orchestrate business logic: database queries, AI calls, and Supabase mutations
- SWR + Zustand for client-side caching and temporary state

## Layers

**Presentation (Client):**
- Purpose: Interactive UI, form handling, client-side navigation, visual feedback
- Location: `src/components/` (ui, layouts, auth, admin, charts, pwa)
- Contains: React Components, shadcn/ui primitives, page shells (DashboardShell, AdminShell), PWA wrappers
- Depends on: Supabase client SDK, hooks, API routes, i18n
- Used by: Pages in `src/app/[locale]/`

**Page Routes (Server + Client):**
- Purpose: Entry points for URL-addressable features, layout composition, server-side guards
- Location: `src/app/[locale]/(group)/route/page.tsx`, `layout.tsx` for each group
- Contains: Layout definitions, page components, route-specific state initialization
- Depends on: Supabase server client, middleware auth context, services
- Used by: Browser navigation

**Route Groups & Middleware:**
- Purpose: Logical grouping of routes with shared layouts, auth patterns, and access control
- Location: `src/app/[locale]/(auth)`, `(onboarding)`, `(dashboard)`, `(admin)`, `src/proxy.ts`
- Contains: `layout.tsx` files that enforce role/status guards, middleware routing logic
- Key patterns:
  - `proxy.ts`: Edge middleware for auth (JWT refresh), role checking (is_coach), and i18n locale management
  - `(auth)/layout.tsx`: Public routes, styled login shell
  - `(dashboard)/layout.tsx`: Client guards, profile/assessment checks, status-based redirects
  - `(admin)/(panel)/layout.tsx`: Coach-only access, badge counts for signups/tickets
- Depends on: Supabase, routing configuration
- Used by: All page routes

**API Routes:**
- Purpose: Backend business logic, database operations, AI integration, and webhooks
- Location: `src/app/api/` with nested paths matching feature domains
- Contains: Route handlers (GET/POST) that validate auth, execute queries, call external services
- Key routes:
  - `auth/sign-in`, `auth/callback`, `auth/logout`, `auth/profile` → Supabase auth orchestration
  - `plans/meal`, `plans/workout` → AI-driven plan generation with DB persistence
  - `tickets` → Support ticket CRUD (GET all, POST create)
  - `admin/approve-signup` → Admin actions (requires `is_coach` role)
  - `admin/ocr` → OCR processing for payment verification
  - `admin/notifications/send` → OneSignal push notifications
  - `notifications/subscription`, `notifications/reminder-time` → PWA notification management
  - `config/pricing` → Static configuration
- Depends on: Supabase server client, AI services, external APIs
- Used by: Client components (fetch), server actions, webhooks

**Data/Services:**
- Purpose: Reusable business logic, external service clients, type-safe queries
- Location: `src/lib/` organized by concern
- Contains:
  - `lib/supabase/server.ts`, `client.ts`, `admin.ts`, `middleware.ts` → Supabase client initialization and session management
  - `lib/ai/openrouter.ts` → OpenRouter API client (DeepSeek V3)
  - `lib/ai/meal-plan-generator.ts`, `workout-plan-generator.ts` → AI prompt engineering and plan generation
  - `lib/auth/helpers.ts`, `utils.ts` → Auth utilities
  - `lib/onesignal.ts` → OneSignal notification client
  - `lib/utils/` → CSS utilities (cn), general helpers
- Depends on: Supabase SDK, external APIs, environment config
- Used by: API routes, server components, client hooks

**Hooks (Client State):**
- Purpose: Encapsulate client-side data fetching, caching, and derived state with SWR
- Location: `src/hooks/`
- Key hooks:
  - `use-auth.ts` → User session + profile (SWR)
  - `use-dashboard.ts` → Dashboard data: streaks, meal/workout progress, today's schedule (SWR)
  - `use-meal-plans.ts`, `use-workout-plans.ts` → Plan history (SWR)
  - `use-tracking.ts` → Weight/measurement history with trend analysis
  - `use-tickets.ts` → Support tickets (SWR)
  - `use-notifications.ts` → Notification settings and badge state
  - `use-toast.ts` → Toast notification queue (Zustand)
- Pattern: Fetch on mount, refetch on demand, expose `loading`/`error`/`refetch` for UI control
- Depends on: Supabase client, SWR, Zustand
- Used by: Client components

**Types:**
- Purpose: Type-safe database schema and external API contracts
- Location: `src/types/database.ts`
- Contains: Auto-generated Supabase types (Database, Row/Insert/Update for each table), custom types (MealPlan, WorkoutPlan, etc.)
- Used by: All server/client code for type inference

**Internationalization:**
- Purpose: Multi-language (en/ar) support with RTL awareness
- Location: `src/i18n/routing.ts`, `src/messages/` (en.json, ar.json)
- Contains: Locale routing config, translation messages by namespace
- Pattern: `next-intl` middleware in `proxy.ts`, `useTranslations()` hook in client components, `getTranslations()` in server components
- Used by: All pages and components

## Data Flow

**Authentication Flow:**
1. User visits `/login` → `(auth)/login/page.tsx` (public route in middleware)
2. Enters email → POST `/api/auth/sign-in` → Supabase OTP sent
3. Clicks magic link from email → `/api/auth/callback` → Supabase session created, redirect to dashboard
4. Middleware `proxy.ts` refreshes JWT on every request → stored in httpOnly cookie
5. Subsequent requests use cookie-based auth → `createClient()` maintains session

**Plan Generation Flow:**
1. User completes check-in on `/check-in` → Client form validation + upload photos to Supabase Storage
2. User clicks "Generate Plan" → POST to `/api/plans/meal` or `/api/plans/workout`
3. API route:
   - Validates auth (user exists)
   - Fetches user profile + initial assessment + check-in data in parallel
   - Calls `generateMealPlan()` or `generateWorkoutPlan()` → constructs AI prompt with context
   - OpenRouter API (DeepSeek V3) returns JSON plan
   - INSERT plan record to `meal_plans`/`workout_plans` table (JSONB format)
   - Optionally send OneSignal push notification: "Your plan is ready"
   - Returns plan to client
4. Client UI renders from API response → displayed on `meal-plan` or `workout-plan` page

**Data Fetching (Client-Side):**
1. Client component renders → Calls hook (e.g., `useAuth()`, `useDashboard()`)
2. Hook initializes SWR with fetcher function → Returns `{ data, loading, error, mutate }`
3. Fetcher calls API route or direct Supabase query
4. Component conditionally renders based on loading/error state
5. User action triggers `mutate()` → Refetch on demand (e.g., after ticket creation)

**Admin Coach Flow:**
1. Coach logs in at `/admin/login` → Supabase auth
2. Middleware checks `is_coach` flag in profiles table → Redirects to `/admin` if true
3. Admin layout (`(admin)/(panel)/layout.tsx`) fetches counts: pending signups, open tickets
4. Coach views signups → Reviews pending_signups table + OCR approval status
5. Coach approves signup → POST `/api/admin/approve-signup` → Updates profile.status to "active", sets plan dates
6. Coach views clients → GET from admin endpoints → SWR caching
7. Coach responds to tickets → POST updates to tickets table

## Key Abstractions

**Supabase Client Factories:**
- Purpose: Centralized auth handling and session management
- Examples: `createClient()` (server), `createClient()` (client), `createAdminClient()` (server, service role)
- Pattern: Singleton pattern for admin, fresh instance per request for server/client
- Ensures: RLS policies enforced on server, auth context propagated to all queries

**AI Plan Generators:**
- Purpose: Encapsulate prompt engineering, API calls, and response parsing for meal/workout plans
- Examples: `generateMealPlan()`, `generateWorkoutPlan()` in `lib/ai/`
- Pattern: Accept user profile + assessment + optional check-in → Return typed GeneratedPlan object
- Ensures: Consistent language (en/ar), structured JSON output, MENA region focus

**SWR Fetchers:**
- Purpose: Reusable data-fetching patterns with caching and refetch-on-demand
- Examples: `useAuth()` fetches from `/api/auth/profile`, `useDashboard()` aggregates multiple queries
- Pattern: Async fetcher function passed to `useSWR()` → Auto-refresh on window focus, manual `mutate()` on user action
- Ensures: Single source of truth per data domain, automatic deduplication

**API Route Pattern:**
- Purpose: Consistent error handling, auth checking, and response formatting
- Pattern: All routes follow: auth check → validate input → execute logic → error handling → structured JSON response
- Ensures: Predictable client-side error handling, no unhandled promise rejections

## Entry Points

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: Every page load
- Responsibilities: Root metadata (PWA manifest, icons), responsive viewport setup

**Locale Layout:**
- Location: `src/app/[locale]/layout.tsx`
- Triggers: Route with locale prefix (e.g., `/en/`, `/ar/`)
- Responsibilities: HTML `lang` and `dir` attributes, i18n message provider, PWA registration, OneSignal setup

**Route Group Layouts:**
- `(auth)/layout.tsx`: Public auth shell with header, marquee, footer
- `(dashboard)/layout.tsx`: Protected client dashboard; checks profile status, redirects if pending/inactive
- `(onboarding)/layout.tsx`: Onboarding flow shell; guides incomplete profiles through assessment
- `(admin)/(panel)/layout.tsx`: Admin shell; fetches coach context (pending counts)

**Middleware (Proxy):**
- Location: `src/proxy.ts`
- Triggers: All non-API requests (public and protected routes)
- Responsibilities:
  1. Skip API/static routes
  2. For public routes: Apply i18n, return
  3. For protected routes: Refresh JWT session, check `is_coach`, route to admin or client, apply i18n

**API Routes:**
- Pattern: Trigger on client fetch/POST
- Example: POST `/api/plans/meal` triggers plan generation + database persistence

## Error Handling

**Strategy:** Try-catch wraps all async operations; graceful fallbacks prevent crashes; Sentry tracks errors.

**Patterns:**
- API routes: Try-catch around request parsing, database operations, external API calls; return `{ error, status }` JSON
- Server components: Redirect on auth failure; caught by layout guards
- Client components: Error boundary around major features; toast notification for recoverable errors
- External services (OpenRouter): Retry up to 3 times; fallback to "plan generation failed" message; log with context (user_id, request_id)

**Sentry Integration:**
- Client errors: Auto-captured by Sentry Nextjs wrapper
- API errors: Manual `Sentry.captureException()` in try-catch
- Source maps: Uploaded to Sentry; deleted from client bundle after upload
- Context: User ID, page URL, timestamp automatically attached

## Cross-Cutting Concerns

**Logging:** Console.error() in catch blocks; no structured logging library (future improvement). Context: user_id, action, error message.

**Validation:** React Hook Form + Zod on client (UI validation); OpenAPI/Zod schemas on API routes (body validation). Return `{ error, status: 400 }` on validation failure.

**Authentication:** Supabase Auth (email/OTP); JWT stored in httpOnly cookie via middleware. RLS policies enforce row-level access. Role check (is_coach) via `public.is_coach()` function to avoid RLS recursion.

**i18n:** next-intl handles locale routing and message injection. All user-facing strings pull from `src/messages/{locale}.json` by namespace. AI-generated plans respect user language preference.

---

*Architecture analysis: 2026-02-12*
