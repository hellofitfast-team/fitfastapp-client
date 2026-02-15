# Phase 9: Admin/Coach Polish - Research

**Researched:** 2026-02-15
**Domain:** Error handling, graceful degradation, and user feedback in admin panel
**Confidence:** HIGH

## Summary

Phase 9 focuses on hardening the admin panel's error handling to provide clear feedback when things go wrong. Currently, the admin panel lacks route-level error boundaries (no `error.tsx` files in admin routes), OneSignal initialization failures are silently caught with only console.error logging, and the settings form's Supabase update operations have no error handling—failures are silently swallowed. This creates a poor coach experience where failures happen invisibly.

The phase addresses two critical integration points: OneSignal (push notifications for clients) and settings persistence (system configuration). Both are coach-facing, meaning errors directly impact the coach's ability to manage the business. The requirements specify surfacing errors to the user (disabled UI states + info messages for OneSignal, toast notifications for settings) and logging all errors to Sentry with context for debugging.

The codebase already has strong foundations: Sentry integrated with context logging patterns (tags, extra), Radix UI Toast implementation via shadcn/ui, route-level error boundaries with brutalist styling in dashboard routes, and the `routeErrors` i18n namespace for localized error messages. This phase extends these patterns to the admin panel.

**Primary recommendation:** Add error boundaries at admin route segments using existing brutalist styling patterns, wrap OneSignal initialization in try-catch with state management to conditionally disable notification UI, add error handling to settings form with toast feedback using existing Radix UI Toast implementation, and log all errors to Sentry with route-specific tags following established patterns.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @sentry/nextjs | 10.38.0 | Error logging with context | Production-grade error tracking, already integrated with tags/extra pattern |
| @radix-ui/react-toast | 1.2.15 | Toast notifications | Accessible, customizable toast primitives, already implemented in codebase |
| react-onesignal | 3.4.6 | OneSignal Web SDK wrapper | Official React wrapper for OneSignal, promise-based initialization |
| next-intl | 4.8.2 | i18n for error messages | Already used for routeErrors namespace, bilingual support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.563.0 | Error icons | Already in use for UI icons (AlertTriangle, XCircle, etc.) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Radix Toast | sonner | sonner is more opinionated but project already uses Radix UI ecosystem |
| Custom error boundary | React Error Boundary library | Custom implementation already exists in codebase with Sentry integration |
| OneSignal state | Global context | Local state simpler for single-component usage (no prop drilling needed) |

**Installation:**
```bash
# No new dependencies required - all packages already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/app/[locale]/(admin)/admin/
├── (panel)/
│   ├── layout.tsx                    # Admin shell (already exists)
│   ├── error.tsx                     # NEW: Top-level admin error boundary
│   ├── settings/
│   │   ├── page.tsx                  # Server component (data fetching)
│   │   ├── error.tsx                 # NEW: Settings-specific error boundary
│   │   └── settings-form.tsx         # Client component - needs error handling
│   ├── signups/
│   │   ├── page.tsx
│   │   └── error.tsx                 # NEW: Signups error boundary
│   └── tickets/
│       ├── page.tsx
│       └── error.tsx                 # NEW: Tickets error boundary
├── login/
│   └── page.tsx
src/components/pwa/
├── OneSignalProvider.tsx             # Needs error state management
└── OneSignalIdentity.tsx             # May need graceful degradation
src/hooks/
└── use-notifications.ts              # Needs OneSignal failure handling
src/messages/
├── en.json                           # Needs admin error messages
└── ar.json                           # Needs admin error messages (RTL)
```

### Pattern 1: Route Segment Error Boundaries for Admin
**What:** Each critical admin route has an error.tsx file that catches rendering errors and displays localized fallback UI
**When to use:** All admin routes that fetch data or perform critical operations (settings, signups, tickets)
**Example:**
```typescript
// Source: Existing dashboard error boundaries (settings/error.tsx, check-in/error.tsx)
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

export default function AdminSettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("routeErrors.adminSettings");

  useEffect(() => {
    // Log with route-specific tags for granular debugging
    Sentry.captureException(error, {
      tags: {
        feature: "admin-settings",
        route: "/admin/settings",
        panel: "admin",
      },
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="space-y-6 p-8">
          {/* Brutalist styling consistent with dashboard error boundaries */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center border-4 border-black bg-error-500">
            <AlertTriangle className="h-10 w-10 text-white" strokeWidth={3} />
          </div>
          <h1 className="text-center font-black text-2xl uppercase tracking-tight">
            {t("title")}
          </h1>
          <p className="text-center text-neutral-700 font-bold">
            {t("description")}
          </p>
          {error.digest && (
            <p className="text-center text-xs text-neutral-500 font-mono">
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            className="w-full border-4 border-black bg-primary py-3 font-black text-white uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Pattern 2: OneSignal Graceful Degradation
**What:** OneSignal initialization wrapped in try-catch with state management to disable notification UI when initialization fails
**When to use:** In OneSignalProvider component and use-notifications hook
**Example:**
```typescript
// Source: OneSignal troubleshooting guide + React error handling patterns
"use client";

import { useEffect, useRef, useState } from "react";
import OneSignal from "react-onesignal";
import * as Sentry from "@sentry/nextjs";

export function OneSignalProvider() {
  const initialized = useRef(false);
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId || initialized.current) return;
    initialized.current = true;

    OneSignal.init({
      appId,
      serviceWorkerParam: { scope: "/" },
      serviceWorkerPath: "/OneSignalSDKWorker.js",
      allowLocalhostAsSecureOrigin: process.env.NODE_ENV === "development",
    })
      .then(() => {
        // Successfully initialized
        setInitError(null);
      })
      .catch((err) => {
        // Ignore "already initialized" error (React StrictMode double render)
        if (String(err).includes("already initialized")) return;

        // Log to Sentry with context
        Sentry.captureException(err, {
          tags: {
            feature: "push-notifications",
            integration: "onesignal",
          },
          extra: {
            appId: appId ? "present" : "missing",
            environment: process.env.NODE_ENV,
          },
        });

        // Set error state to disable notification UI
        setInitError(err instanceof Error ? err : new Error(String(err)));
      });
  }, []);

  // Export error state via context or return value
  return null;
}
```

**UI State Management:**
```typescript
// In notification settings component
export function NotificationSettings() {
  const { isSupported, isSubscribed, toggleSubscription, loading, error } = useNotifications();
  const t = useTranslations("settings");

  // Show disabled state when OneSignal failed to initialize
  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-900">
              {t("notifications.unavailable")}
            </p>
            <p className="text-xs text-amber-700">
              {t("notifications.unavailableDescription")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Normal UI when working
  return (
    <Switch checked={isSubscribed} onCheckedChange={toggleSubscription} disabled={loading} />
  );
}
```

### Pattern 3: Settings Form Error Handling with Toast
**What:** Supabase update operations wrapped in try-catch with toast notifications for success/error feedback
**When to use:** AdminSettingsForm component and any form that updates system_config
**Example:**
```typescript
// Source: Existing use-toast hook + Radix UI Toast implementation
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import * as Sentry from "@sentry/nextjs";

export function AdminSettingsForm({ config }: AdminSettingsFormProps) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSave = async () => {
    const supabase = createClient();

    try {
      // Parallel updates with error checking
      const results = await Promise.all([
        supabase
          .from("system_config")
          .update({ value: checkInDays } as never)
          .eq("key", "check_in_frequency_days"),
        supabase
          .from("system_config")
          .update({
            value: JSON.stringify({ name: instapayName, number: instapayNumber }),
          } as never)
          .eq("key", "coach_instapay_account"),
        supabase
          .from("system_config")
          .update({
            value: JSON.stringify({
              "3_months": Number(price3) || 0,
              "6_months": Number(price6) || 0,
              "12_months": Number(price12) || 0,
            }),
          } as never)
          .eq("key", "plan_pricing"),
      ]);

      // Check for errors in any update
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error(
          `Failed to update ${errors.length} config setting(s): ${errors.map((e) => e.error?.message).join(", ")}`
        );
      }

      // Success toast
      toast({
        title: t("settings.saveSuccess"),
        description: t("settings.saveSuccessDescription"),
        variant: "default",
      });

      startTransition(() => router.refresh());
    } catch (error) {
      // Log to Sentry
      Sentry.captureException(error, {
        tags: {
          feature: "admin-settings",
          operation: "update-config",
        },
        extra: {
          configKeys: ["check_in_frequency_days", "coach_instapay_account", "plan_pricing"],
        },
      });

      // Error toast
      toast({
        title: t("settings.saveError"),
        description: error instanceof Error ? error.message : t("settings.saveErrorGeneric"),
        variant: "destructive",
      });
    }
  };

  return (
    // Form UI
  );
}
```

### Pattern 4: Toast Variants for Error/Success States
**What:** Extended toast hook with variant support for error/success/warning states
**When to use:** All toast notifications that need visual differentiation
**Example:**
```typescript
// Source: shadcn/ui toast patterns + Radix UI Toast documentation
// Extend existing toast component with variants
import { cva, type VariantProps } from "class-variance-authority";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "border-stone-200 bg-white text-stone-950",
        destructive: "border-red-500 bg-red-500 text-white",
        success: "border-green-500 bg-green-500 text-white",
        warning: "border-amber-500 bg-amber-500 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// Usage
toast({
  title: "Error",
  description: "Failed to save settings",
  variant: "destructive",
});

toast({
  title: "Success",
  description: "Settings saved successfully",
  variant: "success",
});
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OneSignal initialization tracking | Custom promise queue, manual state sync | Promise-based .then()/.catch() with useState | OneSignal.init() returns a promise, native promise handling is simpler and more reliable |
| Toast notification system | Custom notification queue, setTimeout management | @radix-ui/react-toast (already installed) | Radix handles viewport management, animations, accessibility, and dismissal logic |
| Error boundary with Sentry | Manual componentDidCatch wrapper | Existing ErrorBoundary component + error.tsx | Codebase already has error boundary with Sentry integration, reuse pattern |
| User-facing error messages | Generic "something went wrong" | next-intl with routeErrors namespace | Already established pattern for localized error messages in both languages |

**Key insight:** The codebase already has production-ready patterns for all requirements. Phase 9 is about **applying existing patterns to new locations** (admin panel), not building new infrastructure.

## Common Pitfalls

### Pitfall 1: OneSignal Double Initialization in React StrictMode
**What goes wrong:** React 19 StrictMode renders components twice in development, causing "already initialized" errors
**Why it happens:** OneSignal.init() is not idempotent—calling it twice throws an error
**How to avoid:** Use useRef to track initialization status and filter out "already initialized" errors in catch block
**Warning signs:** Console errors "OneSignal already initialized" in development only
**Example:**
```typescript
// BAD: No guard against double initialization
useEffect(() => {
  OneSignal.init({ appId }).catch(console.error);
}, []);

// GOOD: Guard with useRef and filter known errors
const initialized = useRef(false);
useEffect(() => {
  if (initialized.current) return;
  initialized.current = true;

  OneSignal.init({ appId }).catch((err) => {
    if (String(err).includes("already initialized")) return;
    // Real error handling
  });
}, []);
```

### Pitfall 2: Silent Supabase Errors in Settings Form
**What goes wrong:** Supabase queries return `{ data, error }` objects—checking only data without verifying error leads to silent failures
**Why it happens:** Current code awaits Promise.all but never checks the error field in results
**How to avoid:** Always check error field in Supabase responses, throw if present to trigger catch block
**Warning signs:** Form appears to succeed but data doesn't update, no feedback to user
**Example:**
```typescript
// BAD: Silently ignores errors
await Promise.all([
  supabase.from("system_config").update({ value: "1" }).eq("key", "foo"),
  supabase.from("system_config").update({ value: "2" }).eq("key", "bar"),
]);

// GOOD: Checks errors and throws
const results = await Promise.all([
  supabase.from("system_config").update({ value: "1" }).eq("key", "foo"),
  supabase.from("system_config").update({ value: "2" }).eq("key", "bar"),
]);
const errors = results.filter((r) => r.error);
if (errors.length > 0) {
  throw new Error(`Update failed: ${errors.map((e) => e.error?.message).join(", ")}`);
}
```

### Pitfall 3: Missing Sentry Context in Error Logs
**What goes wrong:** Errors logged without tags or context make debugging difficult in production—can't filter by feature or route
**Why it happens:** Developers use console.error or basic Sentry.captureException without metadata
**How to avoid:** Always include tags (feature, route, panel) and extra context (userId, operation) in Sentry calls
**Warning signs:** Sentry dashboard shows errors but can't group by feature or filter by admin panel
**Example:**
```typescript
// BAD: No context
Sentry.captureException(error);

// GOOD: Rich context following established pattern
Sentry.captureException(error, {
  tags: {
    feature: "admin-settings",
    route: "/admin/settings",
    panel: "admin",
  },
  extra: {
    operation: "update-config",
    configKeys: ["check_in_frequency_days"],
    userId: user.id,
  },
});
```

### Pitfall 4: Toast Not Visible Due to Missing Toaster Component
**What goes wrong:** Calling toast() function has no visible effect—notifications don't appear
**Why it happens:** <Toaster /> component must be rendered in layout to create the toast viewport
**How to avoid:** Verify <Toaster /> is present in admin layout (likely in AdminShell component)
**Warning signs:** toast() calls in code but no UI appears, no console errors
**Example:**
```tsx
// Check admin layout or AdminShell component
import { Toaster } from "@/components/ui/toaster";

export function AdminShell({ children }) {
  return (
    <div>
      {/* Admin UI */}
      {children}
      {/* REQUIRED: Toaster viewport */}
      <Toaster />
    </div>
  );
}
```

### Pitfall 5: Error Boundaries Don't Catch Async Errors
**What goes wrong:** Errors in async functions (handleSave, fetch calls) don't trigger error.tsx boundaries
**Why it happens:** Error boundaries only catch errors during render phase—async/event handler errors happen outside render
**How to avoid:** Use try-catch in async functions with toast/local state for feedback, error boundaries only catch rendering errors
**Warning signs:** Form submissions fail but error.tsx never appears, console shows uncaught promise rejection
**Example:**
```typescript
// ERROR BOUNDARY CATCHES:
const Component = () => {
  const data = fetchDataSynchronously(); // Throws during render
  return <div>{data}</div>;
};

// ERROR BOUNDARY DOES NOT CATCH:
const Component = () => {
  const handleClick = async () => {
    await fetchDataAsync(); // Throws in event handler
  };
  return <button onClick={handleClick}>Click</button>;
};

// CORRECT PATTERN:
const Component = () => {
  const handleClick = async () => {
    try {
      await fetchDataAsync();
    } catch (error) {
      Sentry.captureException(error);
      toast({ title: "Error", variant: "destructive" });
    }
  };
  return <button onClick={handleClick}>Click</button>;
};
```

## Code Examples

Verified patterns from codebase:

### Example 1: Sentry Context Logging in API Routes
```typescript
// Source: /Users/ziadadel/Desktop/fitfast/src/app/api/admin/notifications/send/route.ts
// Already implemented pattern for admin API error logging
try {
  const onesignal = getOneSignalClient();
  const result = await onesignal.sendToAll(title, message);
  return NextResponse.json(result);
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: "send-notification" },
    extra: { coachId: user.id, send_to_all },
  });
  return NextResponse.json(
    { error: "Failed to send notification" },
    { status: 500 }
  );
}
```

### Example 2: Route Error Boundary with Brutalist Styling
```typescript
// Source: /Users/ziadadel/Desktop/fitfast/src/app/[locale]/(dashboard)/settings/error.tsx
// Template for admin route error boundaries
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("routeErrors.settings");

  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        feature: "settings-page",
        route: "/settings",
      },
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="space-y-6 p-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center border-4 border-black bg-error-500">
            <AlertTriangle className="h-10 w-10 text-white" strokeWidth={3} />
          </div>
          <h1 className="text-center font-black text-2xl uppercase tracking-tight">
            {t("title")}
          </h1>
          <p className="text-center text-neutral-700 font-bold">
            {t("description")}
          </p>
          {error.digest && (
            <p className="text-center text-xs text-neutral-500 font-mono">
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            className="w-full border-4 border-black bg-primary py-3 font-black text-white uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Example 3: Toast Hook Usage
```typescript
// Source: /Users/ziadadel/Desktop/fitfast/src/hooks/use-toast.ts
// How to trigger toasts from components
import { toast } from "@/hooks/use-toast";

// Success toast
toast({
  title: "Settings saved",
  description: "Your changes have been saved successfully.",
});

// Error toast with custom variant
toast({
  title: "Save failed",
  description: "There was a problem saving your settings.",
  variant: "destructive",
});
```

### Example 4: API Validation Error Logging Pattern
```typescript
// Source: /Users/ziadadel/Desktop/fitfast/src/lib/api-validation/index.ts
// Pattern for validation failure logging with context
Sentry.captureException(new Error('Request validation failed'), {
  level: 'warning',
  tags: {
    feature: context.feature,
    validation: 'request-body',
  },
  extra: {
    userId: context.userId,
    errors: result.error.issues,
    body,
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| console.error for all errors | Sentry.captureException with tags/extra | Phase 3-5 (Hardening) | Structured error tracking enables filtering by feature/route in production |
| Generic error messages | Localized routeErrors namespace | Phase 6 (UX Polish) | Bilingual error messages for MENA market |
| Global error boundary only | Route segment error.tsx files | Phase 8 (Component Refactoring) | Granular error handling per route with specific messaging |
| Brutalist error UI | Brutalist error UI (maintained) | Phase 1 (Theme Rebrand) | Consistent brand identity across error states |

**Deprecated/outdated:**
- None—all patterns are current as of Phase 9

**Recent additions:**
- Route-level error boundaries with brutalist styling (Phase 8)
- Sentry tags for feature/route filtering (Phase 5)
- Radix UI Toast with variant system (existing, needs extension for success/error)

## Open Questions

1. **Should admin error boundaries be identical to dashboard or have different styling?**
   - What we know: Dashboard uses brutalist styling with Royal Blue primary color
   - What's unclear: Whether admin panel should be visually distinct from client-facing dashboard
   - Recommendation: Keep identical styling for consistency—admin is part of same brand, not a separate product

2. **Does AdminShell component already render <Toaster />?**
   - What we know: Dashboard layout includes Toaster component
   - What's unclear: Whether admin panel reuses it or needs separate instance
   - Recommendation: Verify in AdminShell component; if missing, add it

3. **Should OneSignal initialization error affect admin panel or only client dashboard?**
   - What we know: OneSignal is for client push notifications, initialized in root layout
   - What's unclear: Whether admin panel uses OneSignal for any features
   - Recommendation: Admin panel likely doesn't need OneSignal UI—verify if use-notifications hook is used in admin routes

## Sources

### Primary (HIGH confidence)
- Existing codebase error boundaries: `/Users/ziadadel/Desktop/fitfast/src/app/[locale]/(dashboard)/settings/error.tsx`
- Existing Sentry patterns: `/Users/ziadadel/Desktop/fitfast/src/app/api/admin/notifications/send/route.ts`
- Existing toast implementation: `/Users/ziadadel/Desktop/fitfast/src/hooks/use-toast.ts`
- OneSignal provider: `/Users/ziadadel/Desktop/fitfast/src/components/pwa/OneSignalProvider.tsx`
- Phase 5 research (API error handling): `/Users/ziadadel/Desktop/fitfast/.planning/phases/05-hardening-api-routes/05-RESEARCH.md`
- Phase 8 research (component patterns): `/Users/ziadadel/Desktop/fitfast/.planning/phases/08-component-refactoring/08-RESEARCH.md`

### Secondary (MEDIUM confidence)
- [React 19 Error Boundaries](https://oneuptime.com/blog/post/2026-01-15-react-error-boundaries/view) - React 19 error hooks (onUncaughtError, onCaughtError)
- [Next.js Error Handling](https://nextjs.org/docs/app/getting-started/error-handling) - error.tsx convention and Error Boundary patterns
- [Sentry React Error Boundary](https://docs.sentry.io/platforms/javascript/guides/react/features/error-boundary/) - Best practices for Sentry integration
- [Radix UI Toast Documentation](https://www.radix-ui.com/primitives/docs/components/toast) - Toast component API and patterns
- [OneSignal Web SDK Troubleshooting](https://onesignal.mintlify.app/docs/en/troubleshooting-web-push) - Initialization verification and common errors

### Tertiary (LOW confidence)
- OneSignal GitHub issues (initialization problems in React) - Community workarounds for double initialization
- Supabase error handling examples - General patterns for error checking in queries

## Metadata

**Confidence breakdown:**
- Error boundary patterns: HIGH - Codebase has established patterns in dashboard routes
- Toast implementation: HIGH - Radix UI Toast already installed and configured
- Sentry logging: HIGH - API routes demonstrate tag/extra context pattern
- OneSignal error handling: MEDIUM - Initialization is promise-based but graceful degradation patterns need verification

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days - stable patterns, no fast-moving dependencies)
