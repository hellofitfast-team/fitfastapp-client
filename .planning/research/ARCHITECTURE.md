# Architecture Patterns for Hardening Next.js 16 + Supabase Apps

**Domain:** Fitness PWA Refactoring and Hardening
**Researched:** 2026-02-12
**Confidence:** HIGH

## Recommended Refactoring Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client Layer (Browser)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Server Comp  │  │ Server Comp  │  │ Server Comp  │           │
│  │ (Data Fetch) │  │ (Layouts)    │  │ (Auth Check) │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                    │
│  ┌──────▼─────────────────▼─────────────────▼───────┐           │
│  │         Client Components (Leaf Nodes)            │           │
│  │   (Forms, Interactivity, State, Browser APIs)     │           │
│  └────────────────────────┬──────────────────────────┘           │
│                           │                                      │
├───────────────────────────┼──────────────────────────────────────┤
│                    Next.js Server Runtime                        │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              API Route Handlers (App Router)             │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │    │
│  │  │ Validation   │→ │ Business     │→ │ Response     │   │    │
│  │  │ (Zod)        │  │ Logic        │  │ (JSON/Error) │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           │                                      │
├───────────────────────────┼──────────────────────────────────────┤
│                    Service Layer                                 │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ AI Service   │  │ Supabase     │  │ External     │           │
│  │ (OpenRouter) │  │ Client       │  │ Services     │           │
│  │ + Retry      │  │ + RLS        │  │ (OneSignal)  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└──────────────────────────────────────────────────────────────────┘

Error Handling Layers (Top to Bottom):
1. Global Error Boundary (global-error.tsx)
2. Route Error Boundaries (error.tsx per route segment)
3. Component Error Boundaries (try-catch + state)
4. API Route Error Handlers (try-catch + NextResponse.json)
5. Service Layer Error Handlers (retry logic + validation)
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Server Components | Data fetching, composition, auth checks | Direct Supabase queries, parallel data loading |
| Client Components (Leaf) | User interaction, browser APIs, local state | Forms, modals, interactive widgets (keep small) |
| API Route Handlers | Validation, orchestration, external API calls | Zod validation → business logic → response |
| Custom Hooks | Extract reusable logic from large components | State management, form handling, data fetching |
| Service Layer | External API calls with retry logic | OpenRouter, Supabase, third-party services |
| Error Boundaries | Catch rendering errors, display fallback UI | Per-route error.tsx files with Sentry logging |

## Recommended Project Structure

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              # Server component with auth/profile guards
│   │   │   ├── error.tsx                # Route-level error boundary
│   │   │   └── check-in/
│   │   │       ├── page.tsx             # REFACTOR: Extract into smaller components
│   │   │       └── _components/         # Private folder for route-specific components
│   │   │           ├── check-in-form.tsx       # Form UI only
│   │   │           ├── photo-upload.tsx        # Photo upload widget
│   │   │           └── progress-summary.tsx    # Progress display
│   │   ├── api/
│   │   │   └── plans/
│   │   │       └── meal/
│   │   │           └── route.ts         # REFACTOR: Add validation + retry
│   │   ├── error.tsx                    # App-level error boundary
│   │   └── global-error.tsx             # Root error boundary
│   └── instrumentation.ts               # Sentry setup, runs once on server init
├── lib/
│   ├── ai/
│   │   ├── openrouter.ts                # REFACTOR: Add retry wrapper
│   │   ├── meal-plan-generator.ts       # REFACTOR: Add Zod validation
│   │   └── schemas/                     # NEW: Zod schemas for AI responses
│   │       ├── meal-plan.schema.ts
│   │       └── workout-plan.schema.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── queries/                     # NEW: Extract reusable query functions
│   │       ├── profiles.ts              # Optimized profile queries
│   │       └── plans.ts                 # Parallelized plan queries
│   └── utils/
│       ├── retry.ts                     # NEW: Exponential backoff retry utility
│       └── errors.ts                    # NEW: Custom error types
├── hooks/
│   └── use-check-in-form.ts             # NEW: Extract check-in page logic
└── types/
    └── api.ts                            # NEW: API request/response types
```

### Structure Rationale

- **`_components/` folders:** Private route-specific components (Next.js convention) prevent accidental imports from other routes
- **`schemas/` folder:** Centralize Zod validation schemas for reuse across API routes and client validation
- **`queries/` folder:** Extract Supabase queries into reusable, testable functions with proper TypeScript types
- **Custom hooks extraction:** Large components (600+ lines) → extract logic to custom hooks, keep component focused on rendering
- **Service layer separation:** AI calls, retry logic, and external services isolated from route handlers

## Architectural Patterns

### Pattern 1: API Route Error Handling Hierarchy

**What:** Structured error handling with validation, try-catch, and typed responses.

**When to use:** All API route handlers that accept user input or call external services.

**Trade-offs:** Adds boilerplate but prevents silent failures and improves debugging.

**Example:**
```typescript
// src/app/api/plans/meal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateMealPlan } from "@/lib/ai/meal-plan-generator";
import { MealPlanResponseSchema } from "@/lib/ai/schemas/meal-plan.schema";

// 1. Define request validation schema
const RequestSchema = z.object({
  checkInId: z.string().uuid().optional(),
  planDuration: z.number().int().min(7).max(30).default(14),
});

export async function POST(request: NextRequest) {
  try {
    // 2. Validate request body
    const body = await request.json();
    const validationResult = RequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: validationResult.error.flatten()
        },
        { status: 400 }
      );
    }

    const { checkInId, planDuration } = validationResult.data;

    // 3. Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 4. Fetch dependencies in parallel (OPTIMIZATION)
    const [profileResult, assessmentResult, checkInResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("initial_assessments").select("*").eq("user_id", user.id).single(),
      checkInId
        ? supabase.from("check_ins").select("*").eq("id", checkInId).single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (profileResult.error || !profileResult.data) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    if (assessmentResult.error || !assessmentResult.data) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    // 5. Call external service with retry (handled in service layer)
    const generatedPlan = await generateMealPlan({
      profile: profileResult.data as any,
      assessment: assessmentResult.data as any,
      checkIn: checkInResult.data || undefined,
      language: (profileResult.data as any).language,
      planDuration,
    });

    // 6. Validate AI response with Zod
    const planValidation = MealPlanResponseSchema.safeParse(generatedPlan);

    if (!planValidation.success) {
      console.error("AI response validation failed:", planValidation.error);
      return NextResponse.json(
        { error: "Generated plan is invalid. Please try again." },
        { status: 500 }
      );
    }

    // 7. Save to database
    const { data: savedPlan, error: saveError } = await supabase
      .from("meal_plans")
      .insert({
        user_id: user.id,
        check_in_id: checkInId || null,
        plan_data: planValidation.data as any,
        language: (profileResult.data as any).language,
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date(Date.now() + planDuration * 86400000)
          .toISOString()
          .split("T")[0],
      } as any)
      .select()
      .single();

    if (saveError) {
      console.error("Error saving meal plan:", saveError);
      return NextResponse.json(
        { error: "Failed to save meal plan" },
        { status: 500 }
      );
    }

    // 8. Fire-and-forget non-critical operations (notifications)
    // Don't await, don't block response
    Promise.resolve().then(async () => {
      try {
        const { getOneSignalClient } = await import("@/lib/onesignal");
        getOneSignalClient().sendToUser(
          user.id,
          "Meal Plan Ready!",
          "Your new meal plan is ready. Check it out!",
          { url: "/meal-plan" }
        );
      } catch (error) {
        console.error("Notification failed (non-blocking):", error);
      }
    });

    // 9. Return success response
    return NextResponse.json({
      success: true,
      mealPlan: savedPlan,
    });

  } catch (error) {
    // 10. Log error with context
    console.error("Meal plan generation error:", {
      error,
      timestamp: new Date().toISOString(),
    });

    // 11. Return generic error to client
    return NextResponse.json(
      { error: "Failed to generate meal plan" },
      { status: 500 }
    );
  }
}
```

### Pattern 2: Exponential Backoff Retry for External APIs

**What:** Retry failed external API calls with exponentially increasing delays and jitter.

**When to use:** OpenRouter API calls, third-party services (not user-facing database queries).

**Trade-offs:** Increases latency on failures but improves reliability. Don't use for user actions (form submissions).

**Example:**
```typescript
// src/lib/utils/retry.ts
export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

/**
 * Retry a function with exponential backoff + jitter
 * Formula: min(baseDelay * 2^attempt + jitter, maxDelay)
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 100,
    maxDelayMs = 10000,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        throw error;
      }

      // Don't delay after last attempt
      if (attempt === maxAttempts - 1) {
        break;
      }

      // Calculate delay with exponential backoff + jitter
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * baseDelayMs; // Random 0-baseDelay
      const delay = Math.min(exponentialDelay + jitter, maxDelayMs);

      // Notify caller of retry
      onRetry?.(attempt + 1, error);

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Determine if an error is retryable (network/server errors, not client errors)
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes("fetch failed") || error.message.includes("ECONNREFUSED")) {
      return true;
    }
  }

  // HTTP response errors
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as any).status;
    // Retry on 5xx (server errors) and 429 (rate limit)
    return status >= 500 || status === 429;
  }

  return false;
}
```

**Integration with OpenRouter:**
```typescript
// src/lib/ai/openrouter.ts (REFACTORED)
import { retryWithBackoff, isRetryableError } from "@/lib/utils/retry";

export class OpenRouterClient {
  async chat(
    messages: OpenRouterMessage[],
    options: {
      temperature?: number;
      max_tokens?: number;
      model?: string;
    } = {}
  ): Promise<string> {
    const {
      temperature = 0.7,
      max_tokens = 4000,
      model = MODEL,
    } = options;

    // Wrap fetch in retry logic
    return retryWithBackoff(
      async () => {
        const response = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "FitFast",
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          const err: any = new Error(`OpenRouter API error: ${response.status} - ${error}`);
          err.status = response.status;
          throw err;
        }

        const data: OpenRouterResponse = await response.json();

        if (!data.choices || data.choices.length === 0) {
          throw new Error("No response from OpenRouter");
        }

        return data.choices[0].message.content;
      },
      {
        maxAttempts: 3,
        baseDelayMs: 200,
        maxDelayMs: 5000,
        shouldRetry: isRetryableError,
        onRetry: (attempt, error) => {
          console.warn(`OpenRouter retry attempt ${attempt}:`, error);
        },
      }
    );
  }
}
```

### Pattern 3: Zod Validation for AI-Generated JSON

**What:** Define strict schemas for AI responses, validate before saving to database.

**When to use:** All AI-generated content (meal plans, workout plans, OCR results).

**Trade-offs:** Adds validation overhead but prevents corrupt data and helps debug AI issues.

**Example:**
```typescript
// src/lib/ai/schemas/meal-plan.schema.ts
import { z } from "zod";

const MealSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  time: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  calories: z.number().int().positive(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  ingredients: z.array(z.string().min(1)).min(1),
  instructions: z.array(z.string().min(1)).min(1),
  alternatives: z.array(z.string()).optional(),
});

const DailyTotalsSchema = z.object({
  calories: z.number().int().positive(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
});

const DayPlanSchema = z.object({
  meals: z.array(MealSchema).min(1),
  dailyTotals: DailyTotalsSchema,
});

export const MealPlanResponseSchema = z.object({
  weeklyPlan: z.record(
    z.enum([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]),
    DayPlanSchema
  ),
  weeklyTotals: DailyTotalsSchema,
  notes: z.string(),
});

// Type inference
export type MealPlanResponse = z.infer<typeof MealPlanResponseSchema>;
export type Meal = z.infer<typeof MealSchema>;
export type DayPlan = z.infer<typeof DayPlanSchema>;
```

**Usage in generator:**
```typescript
// src/lib/ai/meal-plan-generator.ts (REFACTORED)
import { MealPlanResponseSchema, type MealPlanResponse } from "./schemas/meal-plan.schema";

export async function generateMealPlan(
  params: MealPlanGenerationParams
): Promise<MealPlanResponse> {
  const client = getOpenRouterClient();

  // ... build prompts ...

  const response = await client.complete(userPrompt, systemPrompt, {
    temperature: 0.7,
    max_tokens: 6000,
  });

  // Clean response (remove markdown code blocks)
  const cleanedResponse = response
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanedResponse);
  } catch (error) {
    console.error("Failed to parse AI response as JSON:", cleanedResponse);
    throw new Error("AI returned invalid JSON");
  }

  // Validate with Zod
  const validationResult = MealPlanResponseSchema.safeParse(parsed);

  if (!validationResult.success) {
    console.error("AI response validation failed:", {
      errors: validationResult.error.flatten(),
      response: cleanedResponse,
    });
    throw new Error(
      `AI returned invalid meal plan structure: ${validationResult.error.issues[0].message}`
    );
  }

  return validationResult.data;
}
```

### Pattern 4: Parallel Supabase Queries

**What:** Use `Promise.all()` to fetch independent data in parallel instead of sequentially.

**When to use:** API routes that need multiple unrelated tables (profile + assessment + check-in).

**Trade-offs:** Reduces latency but all queries must complete (one failure fails all). Use `Promise.allSettled()` if some can fail.

**Example:**
```typescript
// BEFORE (Sequential - 3x round trips)
const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
const { data: assessment } = await supabase.from("initial_assessments").select("*").eq("user_id", userId).single();
const { data: checkIn } = await supabase.from("check_ins").select("*").eq("id", checkInId).single();

// AFTER (Parallel - 1x round trip for all 3)
const [profileResult, assessmentResult, checkInResult] = await Promise.all([
  supabase.from("profiles").select("*").eq("id", userId).single(),
  supabase.from("initial_assessments").select("*").eq("user_id", userId).single(),
  checkInId
    ? supabase.from("check_ins").select("*").eq("id", checkInId).single()
    : Promise.resolve({ data: null, error: null }), // Skip if no checkInId
]);

// Handle errors after all queries complete
if (profileResult.error) { /* handle */ }
if (assessmentResult.error) { /* handle */ }
```

**With partial failure tolerance:**
```typescript
// Use Promise.allSettled when some queries are optional
const results = await Promise.allSettled([
  supabase.from("profiles").select("*").eq("id", userId).single(),
  supabase.from("meal_plans").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).single(),
  supabase.from("workout_plans").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).single(),
]);

const profile = results[0].status === "fulfilled" ? results[0].value.data : null;
const latestMealPlan = results[1].status === "fulfilled" ? results[1].value.data : null;
const latestWorkoutPlan = results[2].status === "fulfilled" ? results[2].value.data : null;

// Profile is required, plans are optional
if (!profile) {
  throw new Error("Profile not found");
}
```

### Pattern 5: Extract Custom Hooks from Large Components

**What:** Move state management, effects, and business logic out of 600+ line components into custom hooks.

**When to use:** Components with multiple `useState`, `useEffect`, or complex form logic.

**Trade-offs:** Adds abstraction layer but improves testability and component readability.

**Example:**
```typescript
// src/hooks/use-check-in-form.ts
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface CheckInFormData {
  weight: number;
  energyLevel: number;
  sleepQuality: number;
  dietaryAdherence: number;
  notes: string;
  photos: File[];
}

export function useCheckInForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<CheckInFormData>({
    weight: 0,
    energyLevel: 5,
    sleepQuality: 5,
    dietaryAdherence: 5,
    notes: "",
    photos: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof CheckInFormData>(
    field: K,
    value: CheckInFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addPhoto = (file: File) => {
    setFormData((prev) => ({
      ...prev,
      photos: [...prev.photos, file],
    }));
  };

  const removePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const submitCheckIn = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      // Upload photos
      const photoUrls: string[] = [];
      for (const photo of formData.photos) {
        const fileName = `${Date.now()}-${photo.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from("check-in-photos")
          .upload(fileName, photo);

        if (uploadError) throw uploadError;
        photoUrls.push(data.path);
      }

      // Create check-in record
      const { data: checkIn, error: checkInError } = await supabase
        .from("check_ins")
        .insert({
          weight: formData.weight,
          energy_level: formData.energyLevel,
          sleep_quality: formData.sleepQuality,
          dietary_adherence: formData.dietaryAdherence,
          notes: formData.notes,
          photos: photoUrls,
        } as any)
        .select()
        .single();

      if (checkInError) throw checkInError;

      // Trigger plan regeneration
      await fetch("/api/plans/meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkInId: checkIn.id }),
      });

      await fetch("/api/plans/workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkInId: checkIn.id }),
      });

      // Navigate to dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error("Check-in submission failed:", err);
      setError("Failed to submit check-in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    updateField,
    addPhoto,
    removePhoto,
    submitCheckIn,
    isSubmitting,
    error,
  };
}
```

**Refactored component (much smaller):**
```typescript
// src/app/[locale]/(dashboard)/check-in/page.tsx (REFACTORED)
"use client";

import { useCheckInForm } from "@/hooks/use-check-in-form";
import { CheckInFormFields } from "./_components/check-in-form-fields";
import { PhotoUploadWidget } from "./_components/photo-upload-widget";
import { Button } from "@/components/ui/button";

export default function CheckInPage() {
  const {
    formData,
    updateField,
    addPhoto,
    removePhoto,
    submitCheckIn,
    isSubmitting,
    error,
  } = useCheckInForm();

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-2xl font-bold mb-6">Weekly Check-In</h1>

      <CheckInFormFields formData={formData} onChange={updateField} />

      <PhotoUploadWidget
        photos={formData.photos}
        onAdd={addPhoto}
        onRemove={removePhoto}
      />

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded">
          {error}
        </div>
      )}

      <Button
        onClick={submitCheckIn}
        disabled={isSubmitting}
        className="mt-6 w-full"
      >
        {isSubmitting ? "Submitting..." : "Submit Check-In"}
      </Button>
    </div>
  );
}
```

### Pattern 6: SECURITY DEFINER Functions for RLS Optimization

**What:** Move complex RLS checks (with joins) into PostgreSQL functions marked `SECURITY DEFINER` and `STABLE`.

**When to use:** RLS policies that join multiple tables or call functions repeatedly per row.

**Trade-offs:** Requires SQL migration but dramatically improves query performance (10-100x faster).

**Example:**
```sql
-- supabase/migrations/XXX_optimize_rls_with_security_definer.sql

-- Create a SECURITY DEFINER function to check if user has access to a client
CREATE OR REPLACE FUNCTION public.user_has_coach_access(client_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER -- Runs with function owner's permissions (bypasses RLS)
STABLE -- Result doesn't change within a transaction (enables caching)
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_coach = true
  );
$$;

-- Use in RLS policy (Postgres will cache the result per-statement)
CREATE POLICY "Coaches can view all client plans"
ON meal_plans
FOR SELECT
USING (
  (SELECT user_has_coach_access(user_id))
);

-- BEFORE (slow - joins on every row):
-- USING (
--   EXISTS (
--     SELECT 1 FROM profiles
--     WHERE profiles.id = auth.uid()
--     AND profiles.is_coach = true
--   )
-- )

-- AFTER (fast - function result cached per statement):
-- USING ((SELECT user_has_coach_access(user_id)))
```

**Important security note:** Functions used in RLS can be called from the API. Secure sensitive functions by placing them in a schema without API access.

### Pattern 7: Server Component Data Fetching with Error Handling

**What:** Fetch data in Server Components with explicit error handling (not throwing, returning error UI).

**When to use:** Server Components that fetch data (layouts, pages).

**Trade-offs:** More verbose than throwing but provides better UX (partial page renders).

**Example:**
```typescript
// src/app/[locale]/(dashboard)/layout.tsx (Server Component)
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/layouts/dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Fetch profile with error handling
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name,language,is_approved")
    .eq("id", user.id)
    .single();

  // Handle profile errors gracefully
  if (profileError) {
    console.error("Failed to load profile:", profileError);
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">
            Failed to load profile
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  // Check approval status
  if (!profile.is_approved) {
    redirect("/pending");
  }

  return (
    <div className="min-h-screen">
      <DashboardNav userName={profile.full_name} language={profile.language} />
      <main className="container py-6">{children}</main>
    </div>
  );
}
```

### Pattern 8: Client Component Error Boundaries for Event Handlers

**What:** Wrap interactive Client Components in error boundaries to catch event handler errors.

**When to use:** Client Components with forms, buttons, complex interactions.

**Trade-offs:** Requires error boundary wrapper but prevents full page crashes.

**Example:**
```typescript
// src/components/ui/error-boundary.tsx
"use client";

import React from "react";
import * as Sentry from "@sentry/nextjs";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">
              Something went wrong. Please try again.
            </p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

**Usage:**
```typescript
// Wrap complex interactive components
<ErrorBoundary fallback={<div>Failed to load form</div>}>
  <CheckInForm />
</ErrorBoundary>
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Sequential Supabase Queries (Waterfall)

**What people do:** Fetch data sequentially with multiple `await` calls.

**Why it's wrong:** Each query waits for the previous to complete, multiplying latency (3 queries × 50ms = 150ms vs 50ms parallel).

**Do this instead:** Use `Promise.all()` for independent queries (see Pattern 4).

### Anti-Pattern 2: Silent Error Swallowing

**What people do:** `try { ... } catch { /* do nothing */ }` or `catch { return null }`.

**Why it's wrong:** Errors disappear, impossible to debug in production, users see broken UI with no explanation.

**Do this instead:** Always log errors with context, return error states to UI, track in Sentry.

```typescript
// BAD
try {
  await generateMealPlan();
} catch {
  // Silent failure
}

// GOOD
try {
  await generateMealPlan();
} catch (error) {
  console.error("Meal plan generation failed:", {
    userId,
    checkInId,
    error,
  });
  Sentry.captureException(error, {
    tags: { operation: "meal_plan_generation" },
    user: { id: userId },
  });
  throw new Error("Failed to generate meal plan");
}
```

### Anti-Pattern 3: Throwing Errors in Server Actions (Expected Errors)

**What people do:** Use `throw` for validation errors in Server Actions.

**Why it's wrong:** Expected errors (validation failures) should be return values, not exceptions (Next.js 16 best practice).

**Do this instead:** Return error objects from Server Actions, use `useActionState` hook.

```typescript
// BAD
"use server";
export async function createPost(data: FormData) {
  if (!data.get("title")) {
    throw new Error("Title required"); // Don't throw for expected errors
  }
}

// GOOD
"use server";
export async function createPost(prevState: any, formData: FormData) {
  const title = formData.get("title");

  if (!title) {
    return { error: "Title required" }; // Return error as value
  }

  // ... create post ...
  return { success: true };
}
```

### Anti-Pattern 4: Over-Indexing Without Analysis

**What people do:** Add indexes on every column "just in case".

**Why it's wrong:** Indexes slow down writes, increase storage, and don't help if not used by query planner.

**Do this instead:** Use `EXPLAIN ANALYZE` to identify slow queries, add indexes only where sequential scans occur, verify with Supabase index_advisor extension.

### Anti-Pattern 5: Large "use client" Components

**What people do:** Add `"use client"` to entire page components (500+ lines).

**Why it's wrong:** Disables Server Component benefits for entire subtree, ships all code to browser, prevents data fetching optimizations.

**Do this instead:** Keep Server Components at page/layout level, add `"use client"` only to leaf components that need interactivity (buttons, forms).

```typescript
// BAD
"use client"; // Entire page is client component
export default function DashboardPage() {
  const data = useQuery(...); // Client-side data fetching
  return <div>...</div>;
}

// GOOD
// Page is Server Component (no "use client")
export default async function DashboardPage() {
  const data = await fetchData(); // Server-side data fetching
  return (
    <div>
      <ServerComponent data={data} />
      <InteractiveWidget /> {/* Only this is "use client" */}
    </div>
  );
}
```

### Anti-Pattern 6: Validating AI Responses with TypeScript Only

**What people do:** Cast AI responses `as MealPlan` without runtime validation.

**Why it's wrong:** TypeScript types are compile-time only, AI can return malformed JSON that crashes at runtime.

**Do this instead:** Always validate AI responses with Zod at runtime (see Pattern 3).

### Anti-Pattern 7: Blocking API Responses on Non-Critical Operations

**What people do:** `await sendNotification()` before returning API response.

**Why it's wrong:** Notification failures (external service) block the entire request, user waits for non-critical operation.

**Do this instead:** Fire-and-forget with `Promise.resolve().then()` or background job queue.

```typescript
// BAD
await sendNotification(userId, "Plan ready");
return NextResponse.json({ success: true }); // Blocked by notification

// GOOD
Promise.resolve().then(() => sendNotification(userId, "Plan ready")); // Non-blocking
return NextResponse.json({ success: true }); // Returns immediately
```

## Data Flow Patterns

### Request Flow (Client → Server → Database → AI)

```
User Action (Client Component)
    ↓
Form Submit Handler (event handler with error boundary)
    ↓
API Route Handler (validation with Zod)
    ↓ (parallel)
┌───────────────┬───────────────┬───────────────┐
│ Supabase      │ Supabase      │ Supabase      │
│ Query 1       │ Query 2       │ Query 3       │
│ (Profile)     │ (Assessment)  │ (Check-In)    │
└───────┬───────┴───────┬───────┴───────┬───────┘
        └───────────────┼───────────────┘
                        ↓
            AI Service (with retry)
                        ↓
            Zod Validation (AI response)
                        ↓
            Supabase Insert (save plan)
                        ↓
        NextResponse.json (success)
                        ↓ (non-blocking)
            Fire-and-forget Notification
```

### Error Propagation Hierarchy

```
1. Service Layer (retry + throw)
   ↓ (if all retries fail)
2. API Route Handler (try-catch + log + return error JSON)
   ↓ (if fetch fails)
3. Client Component (useState error + display)
   ↓ (if rendering fails)
4. Error Boundary (catch + display fallback UI + log to Sentry)
   ↓ (if error boundary fails)
5. Route Error Boundary (error.tsx + Sentry)
   ↓ (if route error fails)
6. Global Error Boundary (global-error.tsx + Sentry)
```

## Refactoring Order (Dependency-Based)

Refactor in this order to avoid breaking changes:

### Phase 1: Foundation (No Dependencies)
1. **Create Zod schemas** for AI responses (`schemas/meal-plan.schema.ts`, `schemas/workout-plan.schema.ts`)
2. **Create retry utility** (`lib/utils/retry.ts`) with tests
3. **Create error types** (`lib/utils/errors.ts`) for consistent error handling
4. **Add error boundaries** around existing Client Components

### Phase 2: Service Layer (Depends on Phase 1)
5. **Refactor OpenRouter client** to use retry wrapper
6. **Add Zod validation** to AI generators (`meal-plan-generator.ts`, `workout-plan-generator.ts`)
7. **Extract Supabase queries** into reusable functions (`lib/supabase/queries/`)

### Phase 3: API Routes (Depends on Phase 2)
8. **Add input validation** to API routes with Zod request schemas
9. **Parallelize Supabase queries** in API routes (replace sequential with `Promise.all`)
10. **Add comprehensive error handling** with logging and typed responses
11. **Convert blocking operations** to fire-and-forget (notifications)

### Phase 4: Components (Depends on Phase 3)
12. **Extract custom hooks** from large components (`use-check-in-form.ts`)
13. **Split large components** into smaller components (`_components/` folders)
14. **Move data fetching** to Server Components where possible
15. **Add error boundaries** at route segment level

### Phase 5: Database Optimization (Can Run Parallel)
16. **Create SECURITY DEFINER functions** for RLS optimization
17. **Add database indexes** based on `EXPLAIN ANALYZE` results
18. **Update RLS policies** to use new functions

## Scaling Considerations

| Concern | At 100 users | At 1,000 users (Current Target) | At 10,000 users (Future) |
|---------|--------------|----------------------------------|---------------------------|
| **AI Cost** | ~$20/month | ~$200/month | ~$2,000/month (needs batching) |
| **Database Queries** | N+1 acceptable | Must parallelize | Need caching layer (Redis) |
| **Error Monitoring** | Console logs OK | Sentry required | Sentry + custom dashboard |
| **Retry Logic** | 3 attempts OK | 3 attempts + jitter | Need backpressure + circuit breaker |
| **Component Size** | 600+ lines OK | Extract to <200 lines | Need design system |
| **RLS Performance** | Direct policies OK | SECURITY DEFINER functions | Indexed + materialized views |

### Scaling Priorities

1. **First bottleneck (500-1000 users):** Sequential Supabase queries causing slow API responses
   - **Fix:** Implement Pattern 4 (parallel queries)
   - **Expected improvement:** 50-70% reduction in API response time

2. **Second bottleneck (1000+ users):** AI cost and rate limits
   - **Fix:** Add caching for identical requests (same user + same inputs within 24h)
   - **Expected improvement:** 30-40% reduction in AI costs

3. **Third bottleneck (2000+ users):** Large component re-renders causing UI lag
   - **Fix:** Extract hooks (Pattern 5), memoize expensive computations
   - **Expected improvement:** Smoother UI, lower CPU usage

## Sources

- [Next.js Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [Next.js Instrumentation](https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation)
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js 15 Error Handling Best Practices](https://devanddeliver.com/blog/frontend/next-js-15-error-handling-best-practices-for-code-and-routes)
- [Next.js Error Boundary Best Practices](https://www.dhiwise.com/post/nextjs-error-boundary-best-practices)
- [Supabase Query Optimization](https://supabase.com/docs/guides/database/query-optimization)
- [Supabase RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Supabase RLS using Functions - Security Definers](https://blog.entrostat.com/supabase-rls-functions/)
- [Exponential Backoff Implementation](https://advancedweb.hu/how-to-implement-an-exponential-backoff-retry-strategy-in-javascript/)
- [Retrying API Calls with Exponential Backoff](https://bpaulino.com/entries/retrying-api-calls-with-exponential-backoff)
- [Node.js Advanced Patterns: Retry Logic](https://v-checha.medium.com/advanced-node-js-patterns-implementing-robust-retry-logic-656cf70f8ee9)
- [Zod Basics](https://zod.dev/basics)
- [Zod Error Customization](https://zod.dev/error-customization)
- [TypeScript JSON Schema Validation with Zod](https://superjson.ai/blog/2025-08-25-json-schema-validation-typescript-zod-guide/)
- [Refactoring Components with Custom Hooks](https://codescene.com/blog/refactoring-components-in-react-with-custom-hooks)
- [React: Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Common Sense Refactoring of a Messy React Component](https://alexkondov.com/refactoring-a-messy-react-component/)
- [Next.js Route Handlers: The Complete Guide](https://makerkit.dev/blog/tutorials/nextjs-api-best-practices)
- [Error Handling in Next.js API Routes](https://www.geeksforgeeks.org/nextjs/error-handling-in-next-js-api-routes-with-try-catch/)

---
*Architecture research for: FitFast PWA Hardening Milestone*
*Researched: 2026-02-12*
