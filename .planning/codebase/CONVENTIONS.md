# Coding Conventions

**Analysis Date:** 2026-02-12

## Naming Patterns

**Files:**
- Page files: kebab-case (e.g., `meal-plan/page.tsx`, `workout-plan/page.tsx`)
- Component files: PascalCase (e.g., `Header.tsx`, `InstallPrompt.tsx`)
- Hook files: kebab-case with `use-` prefix (e.g., `use-profile.ts`, `use-dashboard.ts`)
- Utility files: kebab-case (e.g., `openrouter.ts`, `cn.ts`)
- Type definition files: camelCase (e.g., `database.ts`)

**Functions and Variables:**
- camelCase for all function and variable names
- Prefix hook functions with `use` (e.g., `useProfile()`, `useDashboardData()`)
- Constants in UPPER_SNAKE_CASE (e.g., `TOAST_LIMIT`, `OPENROUTER_API_URL`, `MODEL`)
- Event handlers use `on` prefix (e.g., `onMenuClick`, `onOpenChange`)
- Callback/state update functions use descriptive verbs (e.g., `switchLocale()`, `genId()`)

**Types and Interfaces:**
- PascalCase for all type and interface names (e.g., `Profile`, `MealPlan`, `GeneratedMealPlan`, `HeaderProps`)
- Suffix interface names with `Props` for component props (e.g., `ButtonProps`, `HeaderProps`)
- Generic type parameters are single uppercase letters (e.g., `T`, `K`, `V`)

## Code Style

**Formatting:**
- Configured via ESLint with Next.js defaults (eslint-config-next/core-web-vitals, eslint-config-next/typescript)
- No explicit Prettier config — uses ESLint's formatting rules
- Default is standard JavaScript/TypeScript formatting: 2-space indentation, semicolons required

**Linting:**
- Uses Next.js ESLint config: `eslint-config-next` v16.1.6
- Config file: `eslint.config.mjs`
- Enforces Core Web Vitals and TypeScript best practices
- Run with: `pnpm lint`
- Note: `pnpm lint` has a known issue reporting invalid project directory

**Project Setup:**
- TypeScript with strict mode enabled (`strict: true`)
- Module resolution: `bundler`
- Target: ES2017
- JSX: `react-jsx` (React 19)

## Import Organization

**Order:**
1. External library imports (React, Next.js, Supabase, etc.)
2. Absolute imports with `@/` alias
3. Relative imports (rarely used)

**Examples:**
```typescript
// Page component
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ClipboardCheck, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardData } from "@/hooks/use-dashboard";

// Route handler
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMealPlan } from "@/lib/ai/meal-plan-generator";
import { getOneSignalClient } from "@/lib/onesignal";

// Client hook
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { MealPlan } from "@/types/database";

// UI component
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
```

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in tsconfig.json)
- All imports use absolute `@/` paths, never relative imports

## Error Handling

**Patterns:**
- Synchronous errors: `try/catch` blocks with console.error logging
- Async/API errors: Destructure Supabase response into `{ data, error }` pairs
- Route handlers: Return NextResponse with appropriate status codes
- Never silently fail — always return error response or log context

**Examples:**
```typescript
// Route handler pattern
try {
  const { data, error } = await supabase.from("table").select(...);
  if (error || !data) {
    return NextResponse.json({ error: "Message" }, { status: 404 });
  }
  // ... success path
} catch (error) {
  console.error("Operation error:", error);
  return NextResponse.json({ error: "Failed" }, { status: 500 });
}

// Non-blocking operations (notification example)
try {
  getOneSignalClient().sendToUser(...);
} catch {
  // Never block response on notification failure
}

// AI generation error
try {
  const response = await client.complete(userPrompt, systemPrompt, {...});
  const mealPlan = JSON.parse(cleanedResponse);
  return mealPlan;
} catch (error) {
  console.error("Meal plan generation error:", error);
  throw new Error("Failed to generate meal plan");
}
```

**Error Tracking:**
- Sentry integration captures exceptions automatically
- Use `Sentry.captureException(error)` in Error Boundary components
- Error boundaries implemented for locale-specific pages (`src/app/[locale]/error.tsx`)
- Global error boundary exists at `src/app/global-error.tsx`

## Logging

**Framework:** Native `console` object (no custom logging library)

**Patterns:**
- `console.error()` for error conditions with context
- `console.warn()` for configuration warnings (e.g., missing API keys)
- Avoid `console.log()` in production code — use only for debugging
- Always log operation context (user_id, request_id, action name)

**Examples:**
```typescript
console.error("Sign-in error:", error);
console.error("Error saving meal plan:", saveError);
console.error("Meal plan generation error:", error);
console.warn("OpenRouter API key not configured");
```

## Comments

**When to Comment:**
- Document why (intent) not what (code is self-explanatory)
- Add comments for non-obvious business logic
- Document API contracts and data structures
- Add comments for workarounds or known limitations
- Keep comments close to relevant code

**JSDoc/TSDoc:**
- Use for public functions and exports
- Include parameter descriptions and return types
- Optional for internal/private functions

**Examples:**
```typescript
/**
 * Hook to fetch and cache the current user's profile
 * Uses SWR for client-side caching and revalidation
 */
export function useProfile() { ... }

/**
 * Create a Supabase client for Server Components and Route Handlers
 * This client properly handles cookies and maintains session state
 */
export async function createClient() { ... }

/**
 * Generate a completion with a simple prompt
 */
async complete(prompt: string, systemPrompt?: string, ...) { ... }
```

## Function Design

**Size:**
- Keep functions under 50 lines for readability
- Larger functions (like page components) acceptable for UI layout logic
- Extract helper functions for reusable logic

**Parameters:**
- Use destructuring for object parameters
- Pass interface types for multiple related parameters
- Keep parameter count <= 3 (use objects for more)

**Return Values:**
- Always specify return types explicitly (TypeScript)
- Use unions for multiple return shapes
- Export type definitions for return interfaces

**Examples:**
```typescript
// Hook with destructured return
export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR(...);
  return {
    profile: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

// Function with interface params
export async function generateMealPlan(
  params: MealPlanGenerationParams
): Promise<GeneratedMealPlan> { ... }

// Route handler with NextRequest/NextResponse
export async function POST(request: Request) {
  try {
    const { email, locale = "en" } = await request.json();
    // ...
    return NextResponse.json({ success: true, ... });
  } catch (error) {
    return NextResponse.json({ error: "..." }, { status: 500 });
  }
}
```

## Module Design

**Exports:**
- Named exports for functions, types, hooks, components
- Default exports only for page components (Next.js convention)
- Export types alongside implementations

**Barrel Files:**
- Used sparingly in layout components: `src/components/layouts/index.ts`
- Syntax: `export { Header } from "./header";`
- Avoid circular dependencies

**Examples:**
```typescript
// src/lib/supabase/server.ts
export async function createClient() { ... }
export function createAdminClient() { ... }

// src/lib/ai/openrouter.ts
export interface OpenRouterMessage { ... }
export interface OpenRouterResponse { ... }
export class OpenRouterClient { ... }
export function getOpenRouterClient(): OpenRouterClient { ... }

// src/hooks/use-profile.ts
export interface ProfileData { ... }
export function useProfile() { ... }
export function useIsAuthenticated() { ... }
export function useCanAccessDashboard() { ... }
```

## Language and i18n Conventions

**Multilingual String Handling:**
- All UI strings use `useTranslations()` from next-intl
- Structure: `t("namespace.key")` (e.g., `t("dashboard.welcome")`, `t("nav.settings")`)
- Labels: Use `.toUpperCase()` for English labels (design choice)
- Arabic: Fully RTL-aware, handle with `useLocale()` to detect "ar"

**Examples:**
```typescript
const t = useTranslations();
const locale = useLocale();

<h1>{t("dashboard.welcome").toUpperCase()}</h1>
{locale === "ar" ? "نص عربي" : "English text"}
<p className={locale === "ar" ? "text-right" : "text-left"}>
```

---

*Convention analysis: 2026-02-12*
