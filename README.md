# FitFast

**AI-powered fitness coaching platform for the MENA region.** A complete client management, meal planning, and workout generation PWA -- designed for single-coach handoff.

---

## Key Features

- **AI-Generated Plans** -- Personalized meal and workout plans generated on every check-in cycle using DeepSeek V3 via OpenRouter (~$0.20/client/month)
- **Client Check-In Wizard** -- Multi-step check-in with weight, measurements, ratings, progress photos, and notes
- **Daily Tracking** -- Meal and workout completion tracking with daily reflections
- **Progress Analytics** -- Weight trend charts, measurement history, and photo comparisons
- **Coach Admin Panel** -- Full dashboard with client management, signup approvals, ticket system, and business configuration
- **Payment Verification** -- OCR-powered payment screenshot analysis for manual approval
- **Bilingual (EN + AR)** -- Full English and Arabic support with RTL layout
- **PWA** -- Installable on mobile with push notifications and offline support
- **Knowledge Base** -- Coach-managed food database and training knowledge that feeds into AI plan generation
- **Ticket System** -- Thread-style client-coach communication with email and push notifications

---

## Tech Stack

| Layer      | Technology                                           |
| ---------- | ---------------------------------------------------- |
| Framework  | Next.js 16+ (App Router, Turbopack), TypeScript      |
| Backend    | Convex (real-time, serverless)                       |
| Auth       | Convex Auth (@convex-dev/auth)                       |
| AI         | OpenRouter (DeepSeek V3, Qwen3-VL) via Vercel AI SDK |
| Styling    | Tailwind CSS v4 + shadcn/ui                          |
| i18n       | next-intl (English + Arabic with RTL)                |
| Forms      | React Hook Form + Zod                                |
| Monitoring | Sentry                                               |
| Email      | Resend                                               |
| Push       | Native Web Push (VAPID)                              |
| Deployment | Vercel                                               |

---

## Monorepo Structure

```
fitfast/
├── apps/
│   ├── client/            # Client PWA (port 3000)
│   ├── admin/             # Coach admin panel (port 3001)
│   └── marketing/         # Marketing / landing page
├── packages/
│   ├── ui/                # @fitfast/ui -- shared components + design system
│   ├── i18n/              # @fitfast/i18n -- routing + navigation
│   └── config/            # @fitfast/config -- shared tsconfig + eslint
├── convex/                # Shared backend (both apps connect to same deployment)
├── docs/                  # Handoff documentation
│   ├── COACH-GUIDE.md     # Non-technical coach user guide
│   ├── DEPLOYMENT.md      # Full deployment runbook
│   ├── OPERATIONS.md      # Day-to-day operations + troubleshooting
│   └── DEMO-SCRIPT.md     # Step-by-step demo walkthrough
├── turbo.json             # Turborepo configuration
├── pnpm-workspace.yaml    # Workspace configuration
└── package.json           # Root scripts (turbo-based)
```

---

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 10 (`corepack enable && corepack prepare pnpm@10.12.1 --activate`)
- Convex account (https://www.convex.dev)
- Convex Auth (built into Convex — no separate account needed)

### 1. Clone and Install

```bash
git clone <repository-url> fitfast
cd fitfast
pnpm install
```

### 2. Set Up Environment Variables

```bash
cp apps/client/.env.example apps/client/.env.local
cp apps/admin/.env.example apps/admin/.env.local
cp convex/.env.example convex/.env
```

Fill in the API keys and URLs. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full environment variable reference.

### 3. Deploy Convex Backend

```bash
npx convex login
npx convex deploy
```

### 4. Seed Test Data

```bash
npx convex env set SEED_USER_PASSWORD "test12345"
npx convex run seedActions:seedTestUsers
```

### 5. Run Development Servers

```bash
# Run both apps in parallel
pnpm dev

# Or run individually
pnpm dev:client    # Client PWA on http://localhost:3000
pnpm dev:admin     # Admin panel on http://localhost:3001
```

### 6. Log In

| Role   | Email                 | Password    |
| ------ | --------------------- | ----------- |
| Coach  | `testadmin@admin.com` | `test12345` |
| Client | `client@fitfast.app`  | `test12345` |

---

## Development Commands

```bash
pnpm dev                  # Run all apps in parallel
pnpm dev:client           # Client PWA only (port 3000)
pnpm dev:admin            # Admin panel only (port 3001)
pnpm build                # Build all apps
pnpm type-check           # TypeScript checking across all packages
pnpm lint                 # Lint all packages
pnpm format               # Format code with Prettier
pnpm test                 # Run unit tests (Vitest)
pnpm test:e2e             # Run end-to-end tests (Playwright)
```

---

## Documentation

| Document                                   | Description                                               |
| ------------------------------------------ | --------------------------------------------------------- |
| [docs/COACH-GUIDE.md](docs/COACH-GUIDE.md) | Non-technical guide for the coach (end user)              |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)   | Complete deployment runbook with all service setup        |
| [docs/OPERATIONS.md](docs/OPERATIONS.md)   | Day-to-day operations, monitoring, and troubleshooting    |
| [docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md) | Step-by-step demo walkthrough with talking points         |
| [CLAUDE.md](CLAUDE.md)                     | Developer reference (architecture, patterns, conventions) |

---

## Screenshots

> Screenshots to be added. Key screens:
>
> - Client dashboard
> - Meal plan view
> - Check-in wizard
> - Admin dashboard
> - Client management
> - Signup approval with payment OCR

---

## License

This project is proprietary software. All rights reserved.

Sold as a one-time handoff to individual fitness coaches. Not licensed for redistribution, resale, or SaaS deployment.
