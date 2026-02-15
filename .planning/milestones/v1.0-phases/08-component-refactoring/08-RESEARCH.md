# Phase 8: Component Refactoring - Research

**Researched:** 2026-02-13
**Domain:** React 19 + Next.js 14 App Router Component Architecture
**Confidence:** HIGH

## Summary

Component refactoring in Next.js 14 App Router requires understanding the Server/Client Component boundary, modern React 19 patterns (useActionState, useFormStatus), and strategic extraction of custom hooks. The primary challenges are:

1. **668-line check-in page** and **594-line initial-assessment page** exceed the 400-line threshold
2. Multiple useState hooks (8+ in check-in page) indicate extractable logic
3. No _components subdirectories exist yet for page-specific components
4. Error boundaries only at root level (global-error.tsx, [locale]/error.tsx), not at route segment level

The codebase already demonstrates good patterns: custom hooks in `/src/hooks/`, React Hook Form + Zod validation, and Sentry integration. Refactoring should preserve these strengths while splitting large components into focused, maintainable pieces.

**Primary recommendation:** Use FormProvider for multi-section forms, extract lock-checking and photo-upload logic into custom hooks, split forms into _components/ subdirectories with compound component patterns, and add error.tsx at critical route segments (check-in, settings, tickets).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | UI framework | Latest stable with useActionState, useFormStatus for form handling |
| Next.js | 16.1.6 | Framework | App Router architecture with Server/Client Components |
| React Hook Form | Latest | Form state | Already in use, supports FormProvider for split forms |
| Zod | Latest | Validation | Already in use, pairs with React Hook Form |
| Sentry | 10.38 | Error tracking | Already integrated, captures errors from error boundaries |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| server-only | Latest | Prevent client imports | Mark server-only utilities (optional but recommended) |
| client-only | Latest | Prevent server imports | Mark browser-only code (optional) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Hook Form | useActionState (React 19) | useActionState is simpler for basic forms but lacks advanced validation features; keep RHF for complex multi-step forms |
| Custom hooks | Inline logic | Inline is faster for one-off use but violates DRY for duplicated patterns |

**Installation:**
```bash
# Optional packages for environment safety
pnpm install server-only client-only
```

## Architecture Patterns

### Recommended Project Structure
```
src/app/[locale]/(dashboard)/
├── check-in/
│   ├── page.tsx                    # Main page (Client Component, orchestration only)
│   └── _components/                # Private folder (not routable)
│       ├── weight-measurements.tsx  # Step 1 form section
│       ├── fitness-metrics.tsx      # Step 2 form section
│       ├── dietary-adherence.tsx    # Step 3 form section
│       ├── photo-upload.tsx         # Step 4 form section
│       ├── review-submit.tsx        # Step 5 form section
│       └── check-in-locked-state.tsx # Lock UI component
├── settings/
│   ├── page.tsx
│   ├── error.tsx                    # Route segment error boundary
│   └── _components/
│       ├── profile-form.tsx
│       ├── notification-settings.tsx
│       └── security-settings.tsx
├── tickets/
│   ├── page.tsx
│   ├── error.tsx
│   └── _components/
│       ├── ticket-list.tsx
│       └── ticket-form.tsx
└── layout.tsx
```

**Key principles:**
- Use `_components/` prefix to make folders private (not routable per [Next.js docs](https://nextjs.org/docs/app/getting-started/project-structure))
- Each route segment can have its own `error.tsx` for isolated error recovery
- Page components orchestrate, child components implement details

### Pattern 1: FormProvider for Multi-Section Forms

**What:** React Hook Form's FormProvider shares form context across nested components without prop drilling.

**When to use:** Forms split into multiple components (multi-step forms, tabbed forms, complex layouts).

**Example:**
```typescript
// Source: React Hook Form Advanced Usage + verified pattern
// app/[locale]/(dashboard)/check-in/page.tsx
"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { WeightMeasurements } from "./_components/weight-measurements";
import { FitnessMetrics } from "./_components/fitness-metrics";

export default function CheckInPage() {
  const methods = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema),
    defaultValues: { energyLevel: 5, sleepQuality: 5, dietaryAdherence: 5 },
  });

  const onSubmit = async (data: CheckInFormData) => {
    // Handle submission
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        {currentStep === 1 && <WeightMeasurements />}
        {currentStep === 2 && <FitnessMetrics />}
        {/* ... */}
      </form>
    </FormProvider>
  );
}
```

```typescript
// _components/weight-measurements.tsx
"use client";

import { useFormContext } from "react-hook-form";

export function WeightMeasurements() {
  const { register, formState: { errors } } = useFormContext<CheckInFormData>();

  return (
    <div>
      <input {...register("weight")} />
      {errors.weight && <span>{errors.weight.message}</span>}
    </div>
  );
}
```

### Pattern 2: Custom Hook for Complex Effects

**What:** Extract stateful logic that coordinates with external systems (browser APIs, network, Supabase).

**When to use:** Duplicated useState + useEffect patterns, complex side effects, or logic that would otherwise make a component >400 lines.

**Example:**
```typescript
// Source: React official docs + verified pattern
// hooks/use-check-in-lock.ts
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useCheckInLock(userId: string | undefined) {
  const [isLocked, setIsLocked] = useState(false);
  const [nextDate, setNextDate] = useState<Date | null>(null);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const checkLockStatus = async () => {
      try {
        const supabase = createClient();
        // Fetch last check-in, frequency, plan start date
        // Calculate lock status
        // Set state
      } catch (error) {
        // Handle error
      } finally {
        setIsLoading(false);
      }
    };

    checkLockStatus();
  }, [userId]);

  return { isLocked, nextDate, daysRemaining, isLoading };
}
```

### Pattern 3: Server Component Data Fetching + Client Component Interactivity

**What:** Fetch data in Server Components, pass to Client Components as props for interactivity.

**When to use:** Pages that need both data fetching AND client-side state/event handlers.

**Example:**
```typescript
// Source: Next.js official docs (Server/Client Components)
// app/[locale]/(dashboard)/tickets/page.tsx (Server Component)
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { TicketsList } from './_components/tickets-list';

export default async function TicketsPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false });

  return <TicketsList initialTickets={tickets} />;
}
```

```typescript
// _components/tickets-list.tsx (Client Component)
"use client";

import { useState } from "react";

export function TicketsList({ initialTickets }) {
  const [filter, setFilter] = useState("all"); // Client-side state

  const filtered = initialTickets.filter(/* ... */);

  return (
    <div>
      <select onChange={(e) => setFilter(e.target.value)}>
        {/* Filter dropdown */}
      </select>
      {/* Render tickets */}
    </div>
  );
}
```

### Pattern 4: Route Segment Error Boundaries

**What:** Place `error.tsx` in route segments to catch rendering errors and provide recovery UI.

**When to use:** Critical user flows (check-in, settings, tickets, payment-sensitive areas).

**Example:**
```typescript
// Source: Next.js official error handling docs
// app/[locale]/(dashboard)/check-in/error.tsx
"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";

export default function CheckInError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { feature: "check-in-page" },
    });
  }, [error]);

  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold">Check-in Error</h2>
        <p className="text-neutral-600">
          We couldn't load the check-in form. Please try again.
        </p>
        <Button onClick={() => reset()}>Retry</Button>
      </div>
    </div>
  );
}
```

**Important:** Error boundaries do NOT catch:
- Errors in event handlers (use try-catch + useState)
- Async code outside useEffect
- Errors in `layout.tsx` of the same segment (requires parent segment's error.tsx)

### Pattern 5: Compound Components

**What:** Parent component manages state, exposes child components for flexible composition.

**When to use:** Related components that share state (modals, tabs, accordions, multi-step forms).

**Example:**
```typescript
// Source: Patterns.dev + FreeCodeCamp compound components guide
// components/check-in/check-in-form.tsx
"use client";

import { createContext, useContext, useState } from "react";

const CheckInContext = createContext<{
  currentStep: number;
  setCurrentStep: (step: number) => void;
} | null>(null);

export function CheckInForm({ children }: { children: React.ReactNode }) {
  const [currentStep, setCurrentStep] = useState(1);

  return (
    <CheckInContext.Provider value={{ currentStep, setCurrentStep }}>
      <div className="check-in-form">{children}</div>
    </CheckInContext.Provider>
  );
}

CheckInForm.StepIndicator = function StepIndicator() {
  const ctx = useContext(CheckInContext);
  return <div>Step {ctx?.currentStep} of 5</div>;
};

CheckInForm.Navigation = function Navigation() {
  const ctx = useContext(CheckInContext);
  return (
    <div>
      <button onClick={() => ctx?.setCurrentStep(ctx.currentStep - 1)}>
        Previous
      </button>
      <button onClick={() => ctx?.setCurrentStep(ctx.currentStep + 1)}>
        Next
      </button>
    </div>
  );
};

// Usage:
// <CheckInForm>
//   <CheckInForm.StepIndicator />
//   <CheckInForm.Navigation />
// </CheckInForm>
```

### Anti-Patterns to Avoid

- **"use client" at the top of every file:** Only add where needed (state, effects, browser APIs). Let Server Components be default.
- **Prop drilling through 3+ levels:** Use context (Client Components) or composition (Server Components as children).
- **Custom "lifecycle" hooks that wrap useEffect:** Don't create `useMount()`, `useEffectOnce()` — these hide dependencies from the linter ([React official docs](https://react.dev/learn/reusing-logic-with-custom-hooks)).
- **Extracting every small piece of JSX:** Some duplication is fine. Extract when there's shared stateful logic, not just shared markup.
- **Event handlers in Server Components:** onClick, onChange require "use client".

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state management | Custom useState + validation logic | React Hook Form + Zod | RHF handles validation, error states, field registration, touched/dirty tracking — already integrated |
| Error boundaries | Custom try-catch wrappers everywhere | Next.js error.tsx files | Built-in, automatic Sentry integration, supports reset() |
| Multi-step form state | Complex switch statements + multiple useState | FormProvider + step components | Context-based, cleaner separation, easier testing |
| File upload with preview | Custom FileReader logic | Extract into usePhotoUpload hook | Already implemented pattern in codebase (check-in page) |
| Server/Client boundary markers | Manual checks | server-only / client-only packages | Compile-time errors prevent accidents |

**Key insight:** Next.js App Router and React 19 provide native solutions for most component organization problems. Don't recreate what the framework already handles (error boundaries, form actions, suspense).

## Common Pitfalls

### Pitfall 1: Moving Too Much Logic to Server Components

**What goes wrong:** Developers over-zealously move components to Server Components, then hit "use client" errors when adding interactivity.

**Why it happens:** Misunderstanding the Server/Client boundary. Server Components cannot use hooks, event handlers, or browser APIs.

**How to avoid:**
- Start with: "Does this need useState, useEffect, onClick, or browser APIs?" → If YES, it's a Client Component.
- Use composition: Server Component fetches data, passes to Client Component for interactivity.
- Minimize "use client" scope: only the interactive parts need it.

**Warning signs:** Error messages like "You're importing a component that needs useState/useEffect but..."

### Pitfall 2: Extracting Hooks Too Early (Premature Abstraction)

**What goes wrong:** Creating custom hooks before duplication exists, leading to over-engineered code.

**Why it happens:** Following "DRY" blindly without considering readability tradeoffs.

**How to avoid:**
- Wait until you see the same pattern 2-3 times before extracting.
- Don't extract trivial hooks like `useFormInput()` for a single `useState([React docs](https://react.dev/learn/reusing-logic-with-custom-hooks)).
- Extract when there's complex logic (multiple hooks coordinating) or duplicated effects.

**Warning signs:** Hooks with only 1-2 lines, hooks used in only 1 place, hooks that don't call other hooks (should be regular functions).

### Pitfall 3: Error Boundaries in Wrong Places

**What goes wrong:** Errors in `layout.tsx` aren't caught by `error.tsx` in the same segment.

**Why it happens:** Misunderstanding the error boundary hierarchy ([Next.js error handling docs](https://nextjs.org/docs/app/getting-started/error-handling)).

**How to avoid:**
- `error.tsx` catches errors from `page.tsx` and nested components in that segment.
- To catch layout errors, place `error.tsx` in the parent segment.
- Use `global-error.tsx` at root for catastrophic failures.

**Warning signs:** Layout crashes bypass error boundaries, root layout errors show blank screen.

### Pitfall 4: FormProvider Without useFormContext

**What goes wrong:** Passing form methods as props when FormProvider is already used.

**Why it happens:** Not understanding FormProvider eliminates prop drilling.

**How to avoid:**
- Parent: `<FormProvider {...methods}><form>...</form></FormProvider>`
- Child: `const { register, formState } = useFormContext()`
- Don't pass register/errors as props — useFormContext retrieves them.

**Warning signs:** Props like `register={register}` when FormProvider is present.

### Pitfall 5: Line Count Target Becomes the Goal

**What goes wrong:** Splitting components mechanically to hit <400 lines without considering cohesion.

**Why it happens:** Treating line count as hard rule instead of code smell indicator.

**How to avoid:**
- 400 lines is a guideline, not a law. A 420-line component that's cohesive beats 3 poorly-separated 140-line components.
- Split by concern (form sections, feature areas), not by line count.
- Measure: Can a new developer understand this component in 5 minutes? If no → refactor.

**Warning signs:** Components split mid-function, unrelated pieces grouped together, excessive imports.

## Code Examples

Verified patterns from official sources:

### Example 1: Multi-Step Form with FormProvider
```typescript
// Source: React Hook Form official docs + Next.js patterns
// Parent: orchestrates steps
"use client";

import { useForm, FormProvider } from "react-hook-form";
import { useState } from "react";
import { WeightStep } from "./_components/weight-step";
import { FitnessStep } from "./_components/fitness-step";

export default function CheckInPage() {
  const [step, setStep] = useState(1);
  const methods = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema),
  });

  const onSubmit = async (data: CheckInFormData) => {
    // Submit to API
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        {step === 1 && <WeightStep />}
        {step === 2 && <FitnessStep />}
        <button onClick={() => setStep(step + 1)}>Next</button>
      </form>
    </FormProvider>
  );
}
```

```typescript
// Child: accesses form context
"use client";

import { useFormContext } from "react-hook-form";

export function WeightStep() {
  const { register, formState: { errors } } = useFormContext<CheckInFormData>();

  return (
    <div>
      <label htmlFor="weight">Weight (kg)</label>
      <input id="weight" type="number" {...register("weight")} />
      {errors.weight && <span>{errors.weight.message}</span>}
    </div>
  );
}
```

### Example 2: Extracting Complex Effect Hook
```typescript
// Source: React official docs (Reusing Logic with Custom Hooks)
// Before: 100+ lines in component
export default function CheckInPage() {
  const [isLocked, setIsLocked] = useState(false);
  const [nextDate, setNextDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 50+ lines of lock checking logic
    const checkLockStatus = async () => { /* ... */ };
    checkLockStatus();
  }, [user]);

  // Rest of component...
}

// After: Extract to custom hook
// hooks/use-check-in-lock.ts
export function useCheckInLock(userId: string | undefined) {
  const [isLocked, setIsLocked] = useState(false);
  const [nextDate, setNextDate] = useState<Date | null>(null);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const checkLockStatus = async () => {
      try {
        const supabase = createClient();
        const [lastCheckInRes, freqRes, lastPlanRes] = await Promise.all([
          supabase.from("check_ins").select("created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from("system_config").select("value")
            .eq("key", "check_in_frequency_days")
            .single(),
          supabase.from("meal_plans").select("start_date")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        // Calculate lock status
        let baselineDate: Date | null = null;
        if (lastCheckInRes.data) {
          baselineDate = new Date(lastCheckInRes.data.created_at);
        } else if (lastPlanRes.data) {
          baselineDate = new Date(lastPlanRes.data.start_date);
        }

        if (baselineDate) {
          const frequency = parseInt(freqRes.data?.value || "14");
          const nextAllowedDate = new Date(baselineDate);
          nextAllowedDate.setDate(nextAllowedDate.getDate() + frequency);

          const now = new Date();
          const locked = now < nextAllowedDate;

          setIsLocked(locked);
          setNextDate(nextAllowedDate);

          if (locked) {
            const days = Math.ceil(
              (nextAllowedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );
            setDaysRemaining(days);
          }
        }
      } catch (error) {
        // Log to Sentry
      } finally {
        setIsLoading(false);
      }
    };

    checkLockStatus();
  }, [userId]);

  return { isLocked, nextDate, daysRemaining, isLoading };
}

// Component becomes much simpler
export default function CheckInPage() {
  const { user } = useAuth();
  const { isLocked, nextDate, isLoading } = useCheckInLock(user?.id);

  if (isLoading) return <Skeleton />;
  if (isLocked) return <LockedState nextDate={nextDate} />;

  return <CheckInForm />;
}
```

### Example 3: Server Component Data + Client Component Interactivity
```typescript
// Source: Next.js Server/Client Components docs
// app/[locale]/(dashboard)/tickets/page.tsx (Server Component - NO "use client")
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { TicketsList } from './_components/tickets-list';

export default async function TicketsPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  // Fetch on server
  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('user_id', session?.user.id)
    .order('created_at', { ascending: false });

  // Pass data to Client Component
  return <TicketsList initialTickets={tickets || []} />;
}
```

```typescript
// _components/tickets-list.tsx (Client Component)
"use client";

import { useState } from "react";
import { Ticket } from "@/types/database";

export function TicketsList({ initialTickets }: { initialTickets: Ticket[] }) {
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

  const filtered = initialTickets.filter((ticket) => {
    if (filter === "all") return true;
    return ticket.status === filter;
  });

  return (
    <div>
      <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
        <option value="all">All Tickets</option>
        <option value="open">Open</option>
        <option value="resolved">Resolved</option>
      </select>

      {filtered.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
}
```

### Example 4: Route Segment Error Boundary
```typescript
// Source: Next.js error handling docs
// app/[locale]/(dashboard)/check-in/error.tsx
"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function CheckInError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("checkIn");

  useEffect(() => {
    // Log to Sentry with context
    Sentry.captureException(error, {
      tags: { feature: "check-in", route: "/check-in" },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error-100">
          <AlertTriangle className="h-6 w-6 text-error-600" />
        </div>

        <h2 className="text-xl font-semibold text-neutral-900">
          {t("error.title")}
        </h2>

        <p className="text-sm text-neutral-600">
          {t("error.description")}
        </p>

        {error.digest && (
          <p className="text-xs text-neutral-400">
            Error ID: {error.digest}
          </p>
        )}

        <Button onClick={() => reset()} className="w-full">
          {t("error.retry")}
        </Button>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class components with lifecycle methods | Function components with hooks | React 16.8 (2019) | Standard practice; all new code uses functions |
| useEffect for form submission | useActionState (React 19) | React 19 (Dec 2024) | Simpler form handling, but RHF still better for complex forms |
| forwardRef for ref forwarding | ref as prop | React 19 (Dec 2024) | Less boilerplate; only needed for legacy interop |
| Pages Router | App Router | Next.js 13 (2022), stable in 14 | Server Components, nested layouts, better data fetching |
| getServerSideProps | async Server Components | Next.js 13+ | Fetch data directly in components, no props wrapper |
| error.js without useEffect | error.js with Sentry in useEffect | Sentry best practice | Automatic error tracking |

**Deprecated/outdated:**
- **Class-based error boundaries:** Still work but function components with error.tsx are Next.js standard
- **_app.js error handling:** App Router uses error.tsx hierarchy instead
- **getInitialProps:** Use Server Components or API routes
- **Massive 1000+ line components:** Industry consensus is 200-400 lines ([Microsoft/Google code review studies](https://group107.com/blog/code-review-best-practices/))

## Open Questions

1. **Should admin panel components be refactored in this phase?**
   - What we know: Admin panel exists at `(admin)/admin/(panel)/`, has similar large components
   - What's unclear: Whether admin panel is in scope or future work
   - Recommendation: Focus on client-facing dashboard first (check-in, settings, tickets). Admin panel can follow same patterns in future phase.

2. **What's the testing strategy for refactored components?**
   - What we know: CLAUDE.md says "Skip test suite for now (focus on visible UX, not infrastructure)"
   - What's unclear: Should we add Vitest tests for extracted hooks?
   - Recommendation: No automated tests in this phase (per CLAUDE.md). Manual testing in browser sufficient.

3. **How aggressive should Server Component migration be?**
   - What we know: Current pages are Client Components ("use client" at top)
   - What's unclear: Which pages MUST remain Client Components vs. could be Server Components
   - Recommendation: Conservative approach — only migrate pages with no interactivity in parent (like tickets/page.tsx which just fetches and renders list). Keep check-in/settings as Client since they're form-heavy.

## Sources

### Primary (HIGH confidence)
- [Next.js Error Handling](https://nextjs.org/docs/app/getting-started/error-handling) - Error boundary patterns, global-error.js, hierarchy
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) - When to use each, composition patterns, "use client" boundary
- [React Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) - When to extract, naming conventions, what NOT to extract
- [Next.js Project Structure](https://nextjs.org/docs/app/getting-started/project-structure) - _components private folder pattern

### Secondary (MEDIUM confidence)
- [React Hook Form Advanced Usage](https://www.react-hook-form.com/advanced-usage/) - FormProvider pattern (verified in codebase)
- [Patterns.dev Compound Components](https://www.patterns.dev/react/compound-pattern/) - Compound component pattern for related components
- [FreeCodeCamp Compound Components Guide](https://www.freecodecamp.org/news/compound-components-pattern-in-react/) - Implementation details
- [Code Review Best Practices 2025](https://group107.com/blog/code-review-best-practices/) - 400-line threshold from Microsoft/Google studies
- [MakerKit Multi-Step Forms](https://makerkit.dev/blog/tutorials/multi-step-forms-reactjs) - Multi-step form patterns updated Feb 2026

### Tertiary (LOW confidence - context only)
- [React 19 Features](https://react.dev/blog/2024/12/05/react-19) - useActionState, useFormStatus (not prioritized for this phase since RHF already in use)
- [Telerik React Design Patterns 2025](https://www.telerik.com/blogs/react-design-patterns-best-practices) - General patterns overview
- [Medium: React 19 and TypeScript Best Practices](https://medium.com/@CodersWorld99/react-19-typescript-best-practices-the-new-rules-every-developer-must-follow-in-2025-3a74f63a0baf) - General guidance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use and verified in package.json
- Architecture patterns: HIGH - Official Next.js and React docs, verified with codebase structure
- Pitfalls: MEDIUM-HIGH - Based on official docs + community consensus, not all tested in this specific codebase
- 400-line threshold: HIGH - Backed by Microsoft/Google engineering studies
- FormProvider pattern: HIGH - Official React Hook Form docs + already used in settings page

**Research date:** 2026-02-13
**Valid until:** 2026-03-15 (30 days - stable stack, Next.js 16.x and React 19 are current stable)

**Codebase-specific findings:**
- Current largest files: check-in/page.tsx (668 lines), initial-assessment/page.tsx (594 lines)
- Existing hooks: 9 custom hooks in /src/hooks/ (good pattern already established)
- No _components directories exist yet (opportunity to introduce pattern)
- Error boundaries: Only at root level, not at route segments (gap to address)
- React Hook Form + Zod: Already integrated and working well (preserve this)
