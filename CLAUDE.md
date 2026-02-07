# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FitFast** is an AI-powered fitness coaching PWA for the MENA region (Egypt). This is a white-label product sold to individual fitness coaches (not SaaS). Each coach instance serves 500-1000 clients.

**Business Model:** One-off sale to coaches. Must be easy to deploy and handoff to non-technical coaches.

## Tech Stack

- **Framework:** Next.js 14+ (App Router) with TypeScript
- **Database/Auth:** Supabase (PostgreSQL + Auth + Storage)
- **AI:** OpenRouter API (DeepSeek V3 for plans, Qwen3-VL for OCR)
- **Styling:** TailwindCSS + shadcn/ui
- **i18n:** next-intl (English + Arabic with RTL)
- **State:** SWR (server state) + Zustand (client state)
- **Forms:** React Hook Form + Zod
- **Deployment:** Vercel + Supabase Cloud

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Type checking
pnpm tsc --noEmit

# Linting
pnpm lint

# Build for production
pnpm build

# Run production build locally
pnpm start
```

## Supabase Cloud (via MCP Tools)

**Project:** fitfast (already created on Supabase Cloud)

**Database Operations:**
- Use Supabase MCP tools for all database operations
- `mcp__plugin_supabase_supabase__list_projects` - List projects
- `mcp__plugin_supabase_supabase__get_project` - Get project details
- `mcp__plugin_supabase_supabase__apply_migration` - Apply schema changes
- `mcp__plugin_supabase_supabase__execute_sql` - Run SQL queries
- `mcp__plugin_supabase_supabase__list_tables` - List tables
- `mcp__plugin_supabase_supabase__get_advisors` - Check security/performance

**No local Supabase CLI needed!**

## Key Architecture Principles

### 1. Cost Optimization is Critical
- AI only runs on check-in submission (not proactively)
- Use efficient models (DeepSeek V3 ~$0.35/M tokens)
- Target: <$0.20 USD per client per month
- USD/EGP exchange rate makes costs ~50x for Egyptian coaches

### 2. Bilingual First
- All UI strings via `next-intl` (English default, Arabic with RTL)
- AI generates plans in user's selected language
- Test both languages for every feature
- Use Tailwind RTL plugin for automatic layout flipping

### 3. Security via RLS
- All Supabase tables have Row Level Security policies
- Users can only access their own data
- Admin role (coach) can read all (future)
- Never query without proper auth context

### 4. Plans are JSONB
- Meal/workout plans stored as flexible JSONB
- AI generates variable structure (don't over-normalize)
- Easy to version and iterate
- Fetch as complete units (no complex joins)

### 5. Scale to 1000 Clients
- Proper indexing on `user_id`, `created_at`
- Pagination for all lists
- Efficient queries with `.select()` to limit fields
- Monitor Supabase performance

## Critical Files

**Priority 1:**
- `/supabase/migrations/001_initial_schema.sql` - Database foundation
- `/src/middleware.ts` - Auth + i18n routing
- `/src/lib/ai/meal-generator.ts` - Core AI value prop
- `/src/lib/ai/workout-generator.ts` - Core AI value prop

**Priority 2:**
- `/src/app/[locale]/dashboard/layout.tsx` - Main app shell
- `/src/app/api/check-in/submit/route.ts` - Orchestrates check-ins + AI

## AI Integration Guidelines

**Prompt Engineering:**
- Include client profile, goals, check-in data
- Request structured JSON output
- Specify language (en/ar)
- Focus on MENA region ingredients (Egypt)
- Include alternatives/swaps for flexibility

**Error Handling:**
- Retry up to 3 times on failure
- Log errors with context (user_id, request_id)
- Fallback: Mark plan as 'failed', notify coach
- Never block user flow on AI failure

**Token Tracking:**
- Log every OpenRouter request (tokens used)
- Display monthly costs to coach
- Alert at 80% of budget threshold

## Common Patterns

### Fetching User Data (Server Component)
```typescript
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const supabase = createServerComponentClient({ cookies });
const { data: { session } } = await supabase.auth.getSession();
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', session.user.id)
  .single();
```

### Fetching User Data (Client Component)
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();
const { data: plans } = await supabase
  .from('meal_plans')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### i18n in Components
```typescript
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('namespace');
  return <h1>{t('key')}</h1>;
}
```

## Future Phases (Don't Build Yet)

**Phase 2:** Admin Panel (separate app for coach)
- Client approval with OCR
- Ticket responses
- Analytics dashboard
- Plan tier configuration

**Phase 3:** Landing Page
- Public site
- Plan showcase
- Checkout + payment upload

## Error Monitoring & Bug Reporting

**Sentry Integration:**
- All errors automatically tracked (frontend + API)
- Error boundaries prevent app crashes
- Source maps for debugging
- Email alerts for critical errors
- User context attached to errors

**Bug Reporting:**
- Clients can report bugs via in-app form
- Auto-captures: device info, page URL, browser
- Screenshot upload optional
- Stored as tickets with `bug_report` category
- Coach reviews via Supabase Studio (admin panel in future)

**Error Handling Best Practices:**
- Wrap AI calls in try-catch with Sentry tracking
- Use React error boundaries around major sections
- Graceful fallbacks (don't crash, show friendly message)
- Retry logic for network failures
- Log context with errors (user_id, action attempted)

## Important Notes

- **Deadline:** March 31, 2026 - Full working app, tested, documented, and handed off
- **Video demonstrations:** Text/images only in MVP. Future: Coach can add YouTube links per exercise via admin panel.
- **Check-in frequency:** Coach-defined globally (all clients same). Use env variable for MVP.
- **Communication:** Ticket system only (no real-time chat). Coach responds manually.
- **Payment verification:** OCR-assisted but coach manually approves all signups via Supabase Studio (admin panel in future).
- **Plan cycles:** 14-day plans (balance between variety and cost)

## Handoff Considerations

This app will be sold to individual coaches who may not be technical:
- All management via Supabase Studio UI (no CLI required)
- Clear documentation for common tasks
- Environment variables well-documented
- Simple Vercel deployment (GitHub integration)
- No complex DevOps requirements
