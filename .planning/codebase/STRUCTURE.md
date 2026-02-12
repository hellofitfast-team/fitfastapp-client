# Codebase Structure

**Analysis Date:** 2026-02-12

## Directory Layout

```
fitfast/
├── src/
│   ├── app/                          # Next.js App Router (file-based routing)
│   │   ├── layout.tsx                # Root layout (metadata, viewport)
│   │   ├── globals.css               # Global Tailwind styles
│   │   ├── [locale]/
│   │   │   ├── layout.tsx            # Locale root (i18n, PWA setup)
│   │   │   ├── (auth)/               # Auth route group
│   │   │   │   ├── layout.tsx        # Auth shell (header, footer, branding)
│   │   │   │   ├── login/
│   │   │   │   ├── magic-link/
│   │   │   │   ├── set-password/
│   │   │   │   └── [other pages]
│   │   │   ├── (onboarding)/         # Onboarding route group
│   │   │   │   ├── layout.tsx        # Onboarding flow
│   │   │   │   ├── welcome/
│   │   │   │   ├── initial-assessment/
│   │   │   │   └── pending/
│   │   │   ├── (dashboard)/          # Client dashboard route group
│   │   │   │   ├── layout.tsx        # Dashboard shell + guards (status/assessment check)
│   │   │   │   ├── page.tsx          # Dashboard home/stats
│   │   │   │   ├── check-in/
│   │   │   │   ├── meal-plan/
│   │   │   │   ├── workout-plan/
│   │   │   │   ├── progress/
│   │   │   │   ├── tracking/
│   │   │   │   ├── tickets/
│   │   │   │   ├── faq/
│   │   │   │   └── settings/
│   │   │   └── (admin)/              # Admin route group (coach-only)
│   │   │       ├── layout.tsx        # Admin wrapper
│   │   │       ├── admin/
│   │   │       │   ├── login/        # Coach login
│   │   │       │   └── (panel)/
│   │   │       │       ├── layout.tsx        # Admin shell + guards + badge counts
│   │   │       │       ├── clients/          # Client list
│   │   │       │       ├── clients/[id]/     # Client detail page
│   │   │       │       ├── signups/          # Pending signup approvals
│   │   │       │       ├── tickets/          # Support ticket responses
│   │   │       │       ├── faqs/             # FAQ management
│   │   │       │       └── settings/         # Coach settings
│   │   └── api/                      # API routes (backend)
│   │       ├── auth/                 # Authentication endpoints
│   │       │   ├── sign-in/route.ts           # POST: Send magic link
│   │       │   ├── callback/route.ts          # Supabase callback after email
│   │       │   ├── logout/route.ts            # POST: Clear session
│   │       │   └── profile/route.ts           # GET: Fetch user profile
│   │       ├── plans/                # Plan generation
│   │       │   ├── meal/route.ts     # POST: Generate meal plan (calls AI)
│   │       │   └── workout/route.ts  # POST: Generate workout plan (calls AI)
│   │       ├── tickets/
│   │       │   └── route.ts          # GET: Fetch tickets, POST: Create ticket
│   │       ├── notifications/
│   │       │   ├── subscription/route.ts     # PWA subscription management
│   │       │   └── reminder-time/route.ts    # Update reminder time
│   │       ├── admin/
│   │       │   ├── ocr/route.ts              # POST: OCR processing for payment verification
│   │       │   ├── approve-signup/route.ts   # POST: Coach approves new client
│   │       │   └── notifications/
│   │       │       └── send/route.ts         # POST: Send OneSignal notification
│   │       └── config/
│   │           └── pricing/route.ts  # GET: Pricing configuration
│   ├── components/                   # React components
│   │   ├── ui/                       # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── select.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── label.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── toast.tsx
│   │   │   └── toaster.tsx
│   │   ├── layouts/                  # Shell components
│   │   │   ├── dashboard-shell.tsx   # Client dashboard wrapper (header, sidebar, main content)
│   │   │   ├── header.tsx            # Dashboard header with user menu
│   │   │   └── sidebar.tsx           # Dashboard navigation
│   │   ├── admin/                    # Admin-specific components
│   │   │   ├── admin-shell.tsx       # Admin wrapper (sidebar, header)
│   │   │   ├── admin-header.tsx      # Admin top bar
│   │   │   └── admin-sidebar.tsx     # Admin navigation
│   │   ├── auth/                     # Auth-specific components
│   │   │   └── LocaleSwitcher.tsx    # Language toggle (en/ar)
│   │   ├── charts/
│   │   │   └── ProgressCharts.tsx    # Weight/measurement charts (Recharts)
│   │   └── pwa/                      # Progressive Web App features
│   │       ├── ServiceWorkerRegistration.tsx   # PWA service worker setup
│   │       ├── OneSignalProvider.tsx           # OneSignal notification setup
│   │       ├── OneSignalIdentity.tsx           # OneSignal user identification
│   │       └── InstallPrompt.tsx               # Install prompt UI
│   ├── lib/                          # Shared libraries and utilities
│   │   ├── supabase/
│   │   │   ├── server.ts             # Supabase server client (SSR safe)
│   │   │   ├── client.ts             # Supabase browser client
│   │   │   ├── admin.ts              # Supabase admin client (service role, bypass RLS)
│   │   │   └── middleware.ts         # Session refresh logic for proxy middleware
│   │   ├── ai/
│   │   │   ├── openrouter.ts         # OpenRouter API client (DeepSeek V3)
│   │   │   ├── meal-plan-generator.ts     # Meal plan AI prompt engineering + parsing
│   │   │   └── workout-plan-generator.ts  # Workout plan AI prompt engineering + parsing
│   │   ├── auth/
│   │   │   ├── helpers.ts            # Auth utility functions
│   │   │   └── utils.ts              # Token parsing, user extraction
│   │   ├── utils/
│   │   │   ├── cn.ts                 # Tailwind classname utility
│   │   │   └── index.ts              # General helpers
│   │   └── onesignal.ts              # OneSignal push notification client
│   ├── hooks/                        # React hooks (client-side)
│   │   ├── use-auth.ts               # Auth state + profile (SWR)
│   │   ├── use-dashboard.ts          # Dashboard data aggregation (SWR)
│   │   ├── use-meal-plans.ts         # Meal plan history (SWR)
│   │   ├── use-workout-plans.ts      # Workout plan history (SWR)
│   │   ├── use-tracking.ts           # Weight/measurement history (SWR)
│   │   ├── use-tickets.ts            # Support tickets (SWR)
│   │   ├── use-notifications.ts      # Notification settings
│   │   └── use-toast.ts              # Toast notification queue (Zustand)
│   ├── types/
│   │   └── database.ts               # Supabase auto-generated schema types
│   ├── messages/                     # i18n translation files
│   │   ├── en.json                   # English translations (namespaced)
│   │   └── ar.json                   # Arabic translations (namespaced)
│   ├── i18n/
│   │   └── routing.ts                # next-intl routing config (locales, locale prefix)
│   ├── proxy.ts                      # Edge middleware for auth + i18n routing
│   └── instrumentation.ts            # Sentry initialization
├── public/                           # Static assets
│   ├── favicon.png
│   ├── apple-touch-icon.png
│   ├── manifest.json                 # PWA manifest
│   └── [other static files]
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # Database schema with RLS policies
├── .planning/
│   └── codebase/                     # Generated planning documents (ARCHITECTURE.md, STRUCTURE.md, etc.)
├── .env.local                        # Local environment variables (secrets, never commit)
├── .env.example                      # Example env template (documentation)
├── next.config.ts                    # Next.js configuration (PWA headers, i18n plugin, Sentry)
├── tsconfig.json                     # TypeScript configuration
├── package.json                      # Project metadata + dependencies
├── pnpm-lock.yaml                    # Dependency lock file
├── eslint.config.mjs                 # ESLint configuration
├── postcss.config.mjs                # PostCSS + Tailwind config
├── sentry.client.config.ts           # Sentry client-side setup
├── sentry.server.config.ts           # Sentry server-side setup
├── sentry.edge.config.ts             # Sentry edge middleware setup
└── CLAUDE.md                         # Project context and guidelines
```

## Directory Purposes

**src/app:**
- Purpose: Next.js App Router; file-based routing determines URL structure
- Contains: Route groups, pages, layouts, API handlers
- Key pattern: `[locale]` dynamic segment parameterizes all routes for i18n; route groups `(name)` organize related pages without affecting URL

**src/app/[locale]/(auth):**
- Purpose: Public authentication pages
- Contains: Login, magic-link confirmation, password set, sign-in orchestration
- Access: No auth required (public routes in middleware)
- Layout: Stylized auth shell with header, marquee, footer

**src/app/[locale]/(dashboard):**
- Purpose: Client-facing fitness features and dashboard
- Contains: Check-in, meal/workout plans, progress tracking, tickets, settings
- Access: Authenticated users only; redirects if status != "active" or no assessment
- Layout: Dashboard shell with header, sidebar navigation

**src/app/[locale]/(onboarding):**
- Purpose: Guided flow for new clients before dashboard access
- Contains: Welcome page, initial assessment form, pending approval status
- Access: Authenticated users with status == "pending_approval" or no assessment yet

**src/app/[locale]/(admin):**
- Purpose: Coach management interface
- Contains: Client management, signup approvals, ticket responses, FAQs, coach settings
- Access: Authenticated coaches only (is_coach == true); checked in middleware
- Layout: Admin shell with different navigation and data context

**src/app/api:**
- Purpose: Backend business logic exposed as HTTP endpoints
- Contains: Auth orchestration, plan generation, database mutations, external service calls
- Pattern: RESTful structure matching feature domains; all routes validate auth first

**src/components/ui:**
- Purpose: Reusable shadcn/ui components
- Contains: Form controls, dialogs, cards, dropdowns
- Pattern: Copy-pasted from shadcn/ui; minimal customization; used across all pages

**src/components/layouts:**
- Purpose: Shell/wrapper components
- Contains: DashboardShell (client dashboard wrapper), Header, Sidebar
- Pattern: Render children within layout, manage nav state, display user info

**src/components/admin:**
- Purpose: Admin-specific UI
- Contains: AdminShell, AdminHeader, AdminSidebar
- Pattern: Similar to client layouts but with coach-specific nav and badge counts

**src/lib/supabase:**
- Purpose: Supabase client initialization and session management
- Key files:
  - `server.ts`: Create server-safe client (handles cookies, session)
  - `client.ts`: Create browser-safe client
  - `admin.ts`: Create admin client with service role key (bypass RLS)
  - `middleware.ts`: Session refresh logic called from `proxy.ts`

**src/lib/ai:**
- Purpose: AI integration and plan generation
- Key files:
  - `openrouter.ts`: OpenRouter API client wrapper (DeepSeek V3)
  - `meal-plan-generator.ts`: Meal plan prompt engineering + JSON parsing
  - `workout-plan-generator.ts`: Workout plan prompt engineering + JSON parsing

**src/hooks:**
- Purpose: Custom React hooks for data fetching and state management
- Pattern: SWR for remote state (auto-refresh, deduplication), Zustand for local state
- Usage: Call from client components to get data + loading/error/refetch

**src/types:**
- Purpose: Type definitions
- Key file: `database.ts` (auto-generated from Supabase schema)
- Usage: Import for type safety in all components and API routes

**src/messages:**
- Purpose: Internationalization translation strings
- Files: `en.json`, `ar.json` with namespaced keys
- Pattern: Keys like `checkIn.steps.weight`, values in respective language
- Usage: `useTranslations('namespace')` in client, `getTranslations()` in server

**supabase/migrations:**
- Purpose: Database schema and RLS policies
- Key file: `001_initial_schema.sql`
- Contains: Table definitions, indexes, row-level security policies, auth setup

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root metadata, PWA setup
- `src/app/[locale]/layout.tsx`: i18n provider, service worker registration, OneSignal setup
- `src/proxy.ts`: Edge middleware for every request (auth, i18n routing)

**Authentication:**
- `src/app/api/auth/sign-in/route.ts`: OTP magic link request
- `src/app/api/auth/callback/route.ts`: Handle Supabase redirect after email click
- `src/lib/supabase/middleware.ts`: Session refresh on each request

**Plans (Core Feature):**
- `src/app/api/plans/meal/route.ts`: POST to generate meal plan
- `src/app/api/plans/workout/route.ts`: POST to generate workout plan
- `src/lib/ai/meal-plan-generator.ts`: AI prompt + parsing
- `src/lib/ai/workout-plan-generator.ts`: AI prompt + parsing

**Dashboard & Client Features:**
- `src/app/[locale]/(dashboard)/layout.tsx`: Status/assessment guards, route to appropriate page
- `src/hooks/use-dashboard.ts`: Dashboard data aggregation (streaks, progress, schedules)
- `src/components/layouts/dashboard-shell.tsx`: Dashboard UI wrapper

**Admin Features:**
- `src/app/[locale]/(admin)/admin/(panel)/layout.tsx`: Admin shell + badge counts
- `src/app/api/admin/approve-signup/route.ts`: Coach approval action
- `src/app/api/admin/ocr/route.ts`: Payment verification OCR

**i18n:**
- `src/i18n/routing.ts`: Locale routing config
- `src/messages/en.json`, `src/messages/ar.json`: Translation strings

**Configuration:**
- `next.config.ts`: Next.js + i18n + Sentry setup
- `tsconfig.json`: TypeScript compiler options
- `.env.local`: Runtime secrets (not committed)
- `CLAUDE.md`: Project guidelines and architecture notes

## Naming Conventions

**Files:**
- `.tsx` → React components (includes JSX)
- `.ts` → TypeScript modules, utilities, services
- `layout.tsx` → Route layout (child wrapper)
- `page.tsx` → Route page (main content)
- `route.ts` → API route handler
- `[param]` → Dynamic segment (e.g., `[locale]`, `[id]`)
- `(group)` → Route group (not affecting URL, for organization)

**Directories:**
- `[locale]` → Parameterized directory (locale segment)
- `(groupName)` → Route group (logical grouping)
- `api/` → API routes
- `components/` → UI components
- `lib/` → Business logic, services, utilities
- `hooks/` → React hooks
- `types/` → TypeScript types
- `messages/` → i18n files

**Components:**
- PascalCase (e.g., `DashboardShell`, `CheckInForm`)
- Descriptive names (e.g., `UserAuthForm`, `MealPlanCard`)
- Layout components: suffix with `Shell` or `Layout`
- Utility/presentational: generic names (e.g., `Header`, `Sidebar`)

**Functions:**
- camelCase (e.g., `generateMealPlan`, `fetchUserProfile`)
- Hooks: prefix `use` (e.g., `useAuth`, `useDashboard`)
- Async: no special prefix, but typed as `async () => Promise<T>`

**Variables:**
- camelCase for local vars, props
- UPPERCASE for constants (e.g., `OPENROUTER_API_URL`)
- Prefixed with `is`/`has` for booleans (e.g., `isLoading`, `hasAssessment`)

**Database/Types:**
- snake_case for table/column names (Supabase convention)
- PascalCase for TypeScript types (e.g., `type Profile`, `interface MealPlan`)

## Where to Add New Code

**New Feature (e.g., Progress Tracking):**
- Primary code:
  - Pages: `src/app/[locale]/(dashboard)/progress/page.tsx`
  - API: `src/app/api/progress/route.ts` (if needed)
  - Hooks: `src/hooks/use-progress.ts`
- Tests: `src/app/[locale]/(dashboard)/progress/page.test.tsx`
- Components: Create in `src/components/` if reusable, else inline in page

**New Component (e.g., ProgressChart):**
- Implementation: `src/components/charts/ProgressChart.tsx`
- Export from: `src/components/index.ts` (barrel file) if widely used
- Usage: Import in pages or parent components

**New API Endpoint:**
- Location: `src/app/api/{feature}/{action}/route.ts`
  - Example: `src/app/api/admin/send-message/route.ts`
- Pattern: Follow existing routes → auth check → validate input → execute → return JSON
- Error handling: Wrap in try-catch, return `{ error, status }` on failure

**New Hook:**
- Location: `src/hooks/use-{feature}.ts`
- Pattern: Use SWR for remote state, expose `{ data, loading, error, refetch }`
- If Zustand needed: Create `stores/{feature}.ts` (not yet in codebase, but follow pattern from `use-toast.ts`)

**Database Changes:**
- Schema: New migration in `supabase/migrations/{N}_description.sql`
- Types: Auto-generated in `src/types/database.ts` after Supabase sync
- Indexes: Add for frequently queried columns (user_id, created_at)
- RLS: Write policies to restrict row access

**Utilities:**
- Shared helpers: `src/lib/utils/`
- Supabase operations: `src/lib/supabase/`
- Auth logic: `src/lib/auth/`

## Special Directories

**src/.next:**
- Purpose: Next.js build output (generated, never edit)
- Generated: Yes
- Committed: No

**node_modules:**
- Purpose: Dependencies installed by pnpm
- Generated: Yes
- Committed: No

**public:**
- Purpose: Static assets served at `/` path
- Contains: Favicons, PWA manifest, images
- Committed: Yes (small files)

**supabase/migrations:**
- Purpose: Database schema version control
- Committed: Yes (all migrations)
- Pattern: Chronological filenames (001_, 002_, etc.)

**src/messages:**
- Purpose: i18n translation files
- Committed: Yes
- Pattern: One JSON file per locale, namespaced keys

**.planning/codebase:**
- Purpose: Generated architecture/structure documentation
- Generated: By `/gsd:map-codebase` command
- Committed: Yes (documents, not sensitive)
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

---

*Structure analysis: 2026-02-12*
