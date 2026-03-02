# FitFast Deployment Guide

Complete technical guide for deploying the FitFast platform from scratch.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Repository Setup](#repository-setup)
3. [Convex Setup](#convex-setup)
4. [Vercel Deployment](#vercel-deployment)
5. [Web Push Setup](#web-push-setup)
6. [Resend Setup](#resend-setup)
7. [Sentry Setup](#sentry-setup)
8. [OpenRouter Setup](#openrouter-setup)
9. [DNS Configuration](#dns-configuration)
10. [Post-Deployment Checklist](#post-deployment-checklist)
11. [Environment Variables Reference](#environment-variables-reference)

---

## Prerequisites

### Accounts Required

| Service    | Purpose                           | Signup URL             |
| ---------- | --------------------------------- | ---------------------- |
| Vercel     | Hosting (client + admin apps)     | https://vercel.com     |
| Convex     | Backend / database / auth         | https://www.convex.dev |
| OpenRouter | AI model access (DeepSeek, Qwen)  | https://openrouter.ai  |
| Resend     | Transactional emails              | https://resend.com     |
| _(none)_   | Push notifications (native VAPID) | _(built-in)_           |
| Sentry     | Error monitoring                  | https://sentry.io      |

### Local Tools

- **Node.js** >= 20
- **pnpm** >= 10 (`corepack enable && corepack prepare pnpm@10.12.1 --activate`)
- **Git**

---

## Repository Setup

### 1. Clone the Repository

```bash
git clone <repository-url> fitfast
cd fitfast
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Understand the Monorepo Structure

```
fitfast/
├── apps/
│   ├── client/          # Client PWA (Next.js) - port 3000
│   ├── admin/           # Coach admin panel (Next.js) - port 3001
│   └── marketing/       # Marketing/landing page
├── packages/
│   ├── ui/              # Shared UI components (@fitfast/ui)
│   ├── i18n/            # i18n routing (@fitfast/i18n)
│   └── config/          # Shared configs (@fitfast/config)
├── convex/              # Shared backend (Convex functions)
├── turbo.json           # Turborepo config
└── pnpm-workspace.yaml  # Workspace config
```

### 4. Create Environment Files

```bash
# Copy example env files
cp apps/client/.env.example apps/client/.env.local
cp apps/admin/.env.example apps/admin/.env.local
cp convex/.env.example convex/.env
```

Fill in the values as you complete each service setup below.

---

## Convex Setup

### 1. Create a Convex Project

```bash
npx convex login
npx convex init
```

When prompted, select your team and create a new project named `fitfast`.

### 2. Deploy Schema and Functions

```bash
npx convex deploy
```

This deploys all functions in the `convex/` directory and creates the database schema.

### 3. Set Convex Environment Variables

```bash
# Required for AI plan generation
npx convex env set OPENROUTER_API_KEY "sk-or-v1-..."

# Required for transactional emails
npx convex env set RESEND_API_KEY "re_..."
npx convex env set RESEND_FROM_EMAIL "FitFast <noreply@yourdomain.com>"

# Required for push notifications (generate keys: npx web-push generate-vapid-keys)
npx convex env set VAPID_PUBLIC_KEY "..."
npx convex env set VAPID_PRIVATE_KEY "..."
npx convex env set VAPID_SUBJECT "mailto:noreply@yourdomain.com"

# Client app URL (used in email links)
npx convex env set CLIENT_APP_URL "https://app.yourdomain.com"

# Marketing site URL (CORS for signup HTTP endpoints)
npx convex env set MARKETING_SITE_URL "https://yourdomain.com"

# Development only: seed user password
npx convex env set SEED_USER_PASSWORD "your-seed-password"
```

### 4. Note the Convex URL

After deployment, Convex outputs your deployment URL:

```
Deployment URL: https://your-deployment-123.convex.cloud
```

Use this as `NEXT_PUBLIC_CONVEX_URL` in both apps.

> **Note:** Authentication is handled by Convex Auth (`@convex-dev/auth`) — no separate auth service is needed. User accounts are stored directly in Convex.

---

## Vercel Deployment

You need to deploy **two separate Vercel projects** from the same repository.

### Project 1: Client App (PWA)

1. Go to https://vercel.com/new and import the repository.
2. Configure:
   - **Project Name**: `fitfast-client`
   - **Root Directory**: `apps/client`
   - **Framework Preset**: Next.js
   - **Build Command**: `cd ../.. && pnpm turbo build --filter=@fitfast/client`
   - **Install Command**: `pnpm install`

3. Add environment variables:

   | Variable                 | Value                         |
   | ------------------------ | ----------------------------- |
   | `NEXT_PUBLIC_CONVEX_URL` | Your Convex deployment URL    |
   | `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for client project |
   | `SENTRY_AUTH_TOKEN`      | Sentry auth token             |
   | `SENTRY_ORG`             | Sentry organization slug      |
   | `SENTRY_PROJECT`         | Sentry project slug (client)  |
   | `OPENROUTER_API_KEY`     | OpenRouter API key            |
   | `NEXT_PUBLIC_APP_URL`    | `https://app.yourdomain.com`  |

4. Deploy.

### Project 2: Admin Panel

1. Import the same repository again.
2. Configure:
   - **Project Name**: `fitfast-admin`
   - **Root Directory**: `apps/admin`
   - **Framework Preset**: Next.js
   - **Build Command**: `cd ../.. && pnpm turbo build --filter=@fitfast/admin`
   - **Install Command**: `pnpm install`

3. Add environment variables:

   | Variable                 | Value                        |
   | ------------------------ | ---------------------------- |
   | `NEXT_PUBLIC_CONVEX_URL` | Same Convex deployment URL   |
   | `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for admin project |
   | `SENTRY_AUTH_TOKEN`      | Sentry auth token            |
   | `SENTRY_ORG`             | Sentry organization slug     |
   | `SENTRY_PROJECT`         | Sentry project slug (admin)  |

4. Deploy.

### Custom Domains

After deployment, add custom domains in each Vercel project's settings:

- Client: `app.yourdomain.com`
- Admin: `admin.yourdomain.com`
- Marketing: `yourdomain.com` / `www.yourdomain.com`

---

## Web Push Setup

Push notifications use the standard Web Push protocol (VAPID) — no third-party service needed.

### 1. Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

This outputs a public key and a private key. Save both.

### 2. Set Convex Environment Variables

```bash
npx convex env set VAPID_PUBLIC_KEY "BPz..."
npx convex env set VAPID_PRIVATE_KEY "..."
npx convex env set VAPID_SUBJECT "mailto:noreply@yourdomain.com"
```

That's it — no account to create, no dashboard to manage. The service worker at `public/sw.js` handles push events automatically.

---

## Resend Setup

### 1. Add and Verify Domain

1. Go to https://resend.com/domains.
2. Add your domain (e.g., `yourdomain.com`).
3. Add the DNS records Resend provides (SPF, DKIM, DMARC).
4. Wait for verification (usually a few minutes).

### 2. Get API Key

1. Go to https://resend.com/api-keys.
2. Create a new API key with "Sending access" permission.
3. Set it as `RESEND_API_KEY` in Convex environment variables.

### 3. Configure From Address

Set `RESEND_FROM_EMAIL` to your verified domain address:

```
FitFast <noreply@yourdomain.com>
```

---

## Sentry Setup

### 1. Create Two Projects

Create two Sentry projects (one for each app):

1. `fitfast-client` (Platform: Next.js)
2. `fitfast-admin` (Platform: Next.js)

### 2. Get DSNs

Each project has a unique DSN on its Settings > Client Keys page. Use these as `NEXT_PUBLIC_SENTRY_DSN` for the respective apps.

### 3. Get Auth Token

1. Go to Settings > Auth Tokens.
2. Create a new token with `project:releases` and `org:read` scopes.
3. Use this as `SENTRY_AUTH_TOKEN` in both Vercel projects.

### 4. Configure Alerts (Recommended)

Set up alert rules in each Sentry project:

- Alert on first occurrence of new issues
- Alert when error frequency spikes
- Weekly email digest of unresolved issues

---

## OpenRouter Setup

### 1. Get API Key

1. Go to https://openrouter.ai/keys.
2. Create a new API key.
3. Add credits to your account ($10-20 is enough to get started).

### 2. Models Used

FitFast uses these models via OpenRouter:

| Model       | Purpose                      | Cost            |
| ----------- | ---------------------------- | --------------- |
| DeepSeek V3 | Meal/workout plan generation | ~$0.35/M tokens |
| Qwen3-VL    | OCR for payment screenshots  | Varies          |

Expected cost: ~$0.20 per client per month.

---

## DNS Configuration

Set up the following DNS records for your domain:

| Type  | Name  | Value                  | Purpose        |
| ----- | ----- | ---------------------- | -------------- |
| CNAME | app   | `cname.vercel-dns.com` | Client PWA     |
| CNAME | admin | `cname.vercel-dns.com` | Admin panel    |
| CNAME | @/www | `cname.vercel-dns.com` | Marketing site |

Also add Resend DNS records (SPF, DKIM, DMARC) for email deliverability.

---

## Post-Deployment Checklist

Run through this checklist after deploying everything:

### Authentication

- [ ] Admin can log in to `admin.yourdomain.com`
- [ ] Client can log in to `app.yourdomain.com`
- [ ] New signups appear in admin Signups page

### AI Plan Generation

- [ ] Submit a test check-in as a client
- [ ] Verify meal plan is generated (check Convex dashboard for `mealPlans` table)
- [ ] Verify workout plan is generated (check `workoutPlans` table)

### Email

- [ ] Approve a signup and verify invitation email is sent
- [ ] Check email deliverability (not going to spam)

### Push Notifications

- [ ] Client app prompts for notification permission
- [ ] Accepting creates a `pushSubscriptions` record in Convex
- [ ] Test notification sends successfully after a check-in

### Sentry

- [ ] Trigger a test error in client app
- [ ] Verify it appears in Sentry dashboard
- [ ] Repeat for admin app

### PWA

- [ ] Client app is installable (Add to Home Screen prompt)
- [ ] Offline page shows when network is unavailable
- [ ] Service worker is registered (check DevTools > Application)

### Bilingual

- [ ] Switch language to Arabic -- UI flips to RTL
- [ ] AI plans generate in Arabic when language is set

---

## Environment Variables Reference

### Client App (`apps/client/.env.local`)

| Variable                 | Required | Description                    |
| ------------------------ | -------- | ------------------------------ |
| `NEXT_PUBLIC_CONVEX_URL` | Yes      | Convex deployment URL          |
| `NEXT_PUBLIC_SENTRY_DSN` | Yes      | Sentry DSN for client project  |
| `SENTRY_AUTH_TOKEN`      | Yes      | Sentry auth token (build-time) |
| `SENTRY_ORG`             | Yes      | Sentry organization slug       |
| `SENTRY_PROJECT`         | Yes      | Sentry project slug            |
| `OPENROUTER_API_KEY`     | Yes      | OpenRouter API key for AI      |
| `NEXT_PUBLIC_APP_URL`    | Yes      | Public URL of the client app   |

### Admin App (`apps/admin/.env.local`)

| Variable                 | Required | Description                    |
| ------------------------ | -------- | ------------------------------ |
| `NEXT_PUBLIC_CONVEX_URL` | Yes      | Same Convex deployment URL     |
| `NEXT_PUBLIC_SENTRY_DSN` | Yes      | Sentry DSN for admin project   |
| `SENTRY_AUTH_TOKEN`      | Yes      | Sentry auth token (build-time) |
| `SENTRY_ORG`             | Yes      | Sentry organization slug       |
| `SENTRY_PROJECT`         | Yes      | Sentry project slug            |

### Convex Backend (`convex/.env`)

| Variable             | Required | Description                                               |
| -------------------- | -------- | --------------------------------------------------------- |
| `OPENROUTER_API_KEY` | Yes      | AI plan generation + OCR                                  |
| `RESEND_API_KEY`     | Yes      | Transactional email sending                               |
| `RESEND_FROM_EMAIL`  | Yes      | Sender address (e.g., `FitFast <noreply@yourdomain.com>`) |
| `VAPID_PUBLIC_KEY`   | Yes      | Web Push VAPID public key                                 |
| `VAPID_PRIVATE_KEY`  | Yes      | Web Push VAPID private key                                |
| `VAPID_SUBJECT`      | Yes      | VAPID subject (e.g., `mailto:noreply@yourdomain.com`)     |
| `CLIENT_APP_URL`     | Yes      | Client app URL (used in email links)                      |
| `MARKETING_SITE_URL` | Yes      | Marketing site URL (CORS)                                 |
| `SEED_USER_PASSWORD` | No       | Password for seeded test users (dev only)                 |
