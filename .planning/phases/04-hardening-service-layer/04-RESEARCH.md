# Phase 4: Hardening Service Layer - Research

**Researched:** 2026-02-12
**Domain:** Service layer reliability for AI generation and database operations
**Confidence:** HIGH

## Summary

Phase 4 builds on Phase 3's foundation (error classes, retry utilities, Zod schemas) to harden the service layer where AI generation and Supabase queries execute. The codebase already has `withRetry()`, custom error types, and validation schemas created - this phase applies them systematically to `lib/ai/` generators and extracts Supabase query logic into reusable functions.

Current state: AI generators (`meal-plan-generator.ts`, `workout-plan-generator.ts`) use bare `JSON.parse()` without error handling, OpenRouter client has no retry logic, and Supabase queries are duplicated across API routes. This phase wraps all risky operations with proper error boundaries and logging.

**Primary recommendation:** Apply defense-in-depth pattern: retry network calls (OpenRouter), validate AI output (Zod), catch JSON parsing errors (Sentry), and extract query duplication into typed functions.

## Standard Stack

### Core Infrastructure (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| exponential-backoff | 3.1.3 | Retry logic with jitter | Industry standard for exponential backoff, already used in `withRetry()` |
| zod | 4.3.6 | Runtime validation | Type-safe schema validation, already used for plan validation |
| @sentry/nextjs | 10.38.0 | Error logging/monitoring | Production error tracking, already integrated |
| swr | 2.4.0 | Client-side data fetching | React hooks with built-in caching, already used in `use-dashboard.ts` |

### AI/Database Stack (Existing)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/ssr | 0.8.0 | Supabase client for Next.js | All database operations |
| OpenRouter API | N/A (REST) | AI generation via DeepSeek V3 | Meal/workout plan generation |
| Qwen3-VL | N/A (REST) | OCR for payment screenshots | Admin signup approval flow |

### No Additional Dependencies Needed
Phase 3 already created all required utilities. Phase 4 is application/integration work, not new infrastructure.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── ai/
│   │   ├── openrouter.ts                # API client (needs retry wrapper)
│   │   ├── meal-plan-generator.ts       # Generator (needs validation)
│   │   └── workout-plan-generator.ts    # Generator (needs validation)
│   ├── supabase/
│   │   ├── queries/                     # NEW: Extracted query functions
│   │   │   ├── profiles.ts              # Profile queries
│   │   │   ├── assessments.ts           # Assessment queries
│   │   │   ├── plans.ts                 # Meal/workout plan queries
│   │   │   └── check-ins.ts             # Check-in queries
│   │   ├── client.ts                    # Existing client factory
│   │   ├── server.ts                    # Existing server factory
│   │   └── admin.ts                     # Existing admin client
│   ├── errors/                          # Phase 3 - already complete
│   │   ├── types.ts                     # Custom error classes
│   │   ├── retry.ts                     # withRetry() utility
│   │   └── index.ts                     # Barrel exports
│   └── validation/                      # Phase 3 - already complete
│       ├── meal-plan.ts                 # Zod schemas + validator
│       ├── workout-plan.ts              # Zod schemas + validator
│       └── index.ts                     # Barrel exports
```

### Pattern 1: Wrapping OpenRouter API Calls with Retry
**What:** All network calls to OpenRouter API wrapped in `withRetry()` with exponential backoff
**When to use:** Any `fetch()` call to external AI services (OpenRouter, vision models)
**Example:**
```typescript
// Source: src/lib/errors/retry.ts (Phase 3)
import { withRetry, AIGenerationError } from "@/lib/errors";

export class OpenRouterClient {
  async chat(messages: OpenRouterMessage[], options = {}): Promise<string> {
    return withRetry(
      async () => {
        const response = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: { /* auth headers */ },
          body: JSON.stringify({ model, messages, ...options }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new AIGenerationError(
            `OpenRouter API error: ${response.status}`,
            "openrouter",
            new Error(errorText)
          );
        }

        const data = await response.json();
        if (!data.choices?.[0]?.message?.content) {
          throw new AIGenerationError(
            "No response from OpenRouter",
            "openrouter"
          );
        }

        return data.choices[0].message.content;
      },
      {
        maxAttempts: 3,
        operationName: "openrouter-chat",
        shouldRetry: (error) => {
          // Don't retry client errors (400-level), only network/server errors
          if (error.message.includes("400") || error.message.includes("401")) {
            return false;
          }
          return true;
        },
      }
    );
  }
}
```

### Pattern 2: Validating AI Responses with Zod
**What:** All AI-generated JSON parsed and validated through Zod schemas before database save
**When to use:** After receiving raw string response from AI, before inserting into database
**Example:**
```typescript
// Source: src/lib/validation/meal-plan.ts (Phase 3)
import { validateMealPlanResponse } from "@/lib/validation";
import { AIGenerationError } from "@/lib/errors";

export async function generateMealPlan(params: MealPlanGenerationParams) {
  const client = getOpenRouterClient();

  try {
    // Step 1: Get raw response from AI (now with retry)
    const rawResponse = await client.complete(userPrompt, systemPrompt, options);

    // Step 2: Validate with Zod (handles JSON.parse + schema validation)
    // If validation fails, throws ValidationError and logs to Sentry
    const validatedPlan = validateMealPlanResponse(rawResponse);

    return validatedPlan;
  } catch (error) {
    if (error instanceof ValidationError) {
      // Validation failed - AI returned invalid structure
      throw new AIGenerationError(
        "AI generated invalid meal plan structure",
        "openrouter",
        error
      );
    }
    // Other errors (RetryError, network errors) bubble up
    throw error;
  }
}
```

### Pattern 3: Extracted Supabase Query Functions
**What:** Reusable, typed query functions replace inline `.from().select()` duplication
**When to use:** When same query appears in multiple API routes or components
**Example:**
```typescript
// Source: NEW file - src/lib/supabase/queries/profiles.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { AppError } from "@/lib/errors";
import * as Sentry from "@sentry/nextjs";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Fetch a user profile by ID.
 * Throws AppError with context if profile not found.
 */
export async function getProfileById(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single<Profile>();

  if (error || !data) {
    Sentry.captureException(error || new Error("Profile not found"), {
      tags: { feature: "profile-query" },
      extra: { userId, errorCode: error?.code },
    });
    throw new AppError("Profile not found", "PROFILE_NOT_FOUND", { userId });
  }

  return data;
}
```

### Pattern 4: Service Layer Error Context
**What:** All errors include structured context (userId, action, timestamp) for debugging
**When to use:** When catching/throwing errors in service layer operations
**Example:**
```typescript
// When catching errors in API routes
catch (error) {
  Sentry.captureException(error, {
    tags: {
      feature: "meal-plan-generation",
      userId: user.id,
    },
    extra: {
      action: "generate-meal-plan",
      timestamp: new Date().toISOString(),
      checkInId: body.checkInId,
      planDuration: body.planDuration,
    },
  });

  // Return user-friendly error, full context sent to Sentry
  return NextResponse.json(
    { error: "Failed to generate meal plan" },
    { status: 500 }
  );
}
```

### Anti-Patterns to Avoid
- **Bare JSON.parse without try-catch:** Always wrap in try-catch or use Zod validation helpers
- **Silent error swallowing:** `catch {}` blocks hide production issues - always log to Sentry
- **Inline query duplication:** Repeated `.from("profiles").select("*").eq("id", userId)` across routes - extract to query function
- **Missing retry logic on network calls:** External API calls can fail transiently - wrap in `withRetry()`
- **Validation after database save:** Validate AI output BEFORE inserting to database to avoid corrupt data

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Exponential backoff retry | Custom retry loop with setTimeout | `exponential-backoff` library via `withRetry()` | Handles jitter, max delay, attempt tracking automatically |
| JSON validation | Manual property checking | Zod schemas with `.safeParse()` | Type-safe, composable, generates TypeScript types |
| Error tracking | `console.error()` only | Sentry captureException with context | Aggregates errors, alerts on spikes, provides stack traces |
| Query result type casting | `as any` or unsafe casts | Supabase generics with Database type | Type-safe at compile time, catches schema mismatches |

**Key insight:** Service layer hardening is about defense-in-depth. Network calls can fail (retry), AI can return invalid JSON (validate), and database queries can error (add context). Each layer catches a different failure mode.

## Common Pitfalls

### Pitfall 1: Retrying Non-Idempotent Operations Without Safeguards
**What goes wrong:** Retry logic on database INSERT can create duplicate records
**Why it happens:** `withRetry()` will retry failed operations, but INSERT operations may partially succeed before failing
**How to avoid:** Only retry read operations and idempotent writes. For INSERTs, add unique constraints or upsert logic.
**Warning signs:** Duplicate meal plans with same user_id + check_in_id, duplicate check-ins on same date

**Solution pattern:**
```typescript
// DON'T retry raw INSERT operations
const plan = await withRetry(() =>
  supabase.from("meal_plans").insert({ user_id, ... })
); // May create duplicates on transient failures!

// DO use unique constraints + upsert, or avoid retrying writes
const { data, error } = await supabase
  .from("meal_plans")
  .upsert(
    { user_id, check_in_id, plan_data },
    { onConflict: "user_id,check_in_id" } // Prevents duplicates
  );
```

### Pitfall 2: Validation Errors vs. Genuine AI Failures
**What goes wrong:** AI returns valid response but Zod schema rejects it due to schema mismatch
**Why it happens:** AI output evolves (adds new fields, changes structure) but schema doesn't update
**How to avoid:** Use `.passthrough()` on Zod schemas to allow extra fields, log schema validation failures separately
**Warning signs:** High rate of ValidationError in Sentry despite AI generating reasonable-looking output

**Solution pattern:**
```typescript
// Strict schema - will reject if AI adds new fields
const StrictMealPlanSchema = z.object({
  weeklyPlan: z.record(z.string(), DailyMealPlanSchema),
  weeklyTotals: DailyTotalsSchema,
  notes: z.string(),
}); // Rejects if AI adds "tips" field

// Flexible schema - allows evolution
const FlexibleMealPlanSchema = z.object({
  weeklyPlan: z.record(z.string(), DailyMealPlanSchema),
  weeklyTotals: DailyTotalsSchema,
  notes: z.string(),
}).passthrough(); // Allows extra fields, still validates required ones
```

### Pitfall 3: Missing Locale Context in Error Messages
**What goes wrong:** Arabic users see English error messages, breaking bilingual UX
**Why it happens:** Service layer errors don't include locale, API routes return hardcoded English errors
**How to avoid:** Pass locale through API request, use next-intl for error messages, log locale in Sentry context
**Warning signs:** User confusion in Arabic locale, support tickets about English errors

**Solution pattern:**
```typescript
// API route extracts locale from request
export async function POST(request: NextRequest) {
  const locale = request.headers.get("x-locale") || "en";

  try {
    // ... operation ...
  } catch (error) {
    Sentry.captureException(error, {
      tags: { locale },
      extra: { /* context */ },
    });

    // Return localized error (server-side translation)
    const errorMessage = locale === "ar"
      ? "فشل في إنشاء خطة الوجبات"
      : "Failed to generate meal plan";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```

### Pitfall 4: Over-Logging in Retry Attempts
**What goes wrong:** Sentry quota exhausted by retry attempt warnings on transient failures
**Why it happens:** `withRetry()` logs each attempt as warning, 3 attempts × many users = noise
**How to avoid:** Only log final RetryError as error, use breadcrumbs for retry attempts
**Warning signs:** Sentry quota warnings, mostly "Retry attempt X/3" messages in Sentry

**Solution pattern:**
```typescript
// Current implementation in retry.ts logs each attempt as warning
// Consider using Sentry.addBreadcrumb() instead for retry attempts
Sentry.addBreadcrumb({
  category: "retry",
  message: `Attempt ${currentAttempt}/${maxAttempts} for ${operationName}`,
  level: "info", // Not warning - reduces quota usage
  data: { errorMessage: error.message },
});

// Only capture final failure as error (already done in retry.ts)
if (allAttemptsExhausted) {
  Sentry.captureException(retryError, { level: "error" });
}
```

## Code Examples

Verified patterns from codebase and official documentation:

### OpenRouter API Client with Retry (Full Implementation)
```typescript
// Source: src/lib/ai/openrouter.ts (Phase 4 update)
import { withRetry, AIGenerationError } from "@/lib/errors";
import * as Sentry from "@sentry/nextjs";

export class OpenRouterClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || "";
    if (!this.apiKey) {
      console.warn("OpenRouter API key not configured");
    }
  }

  /**
   * Make a chat completion request with automatic retry.
   * Retries up to 3 times with exponential backoff on network/server errors.
   */
  async chat(
    messages: OpenRouterMessage[],
    options: {
      temperature?: number;
      max_tokens?: number;
      model?: string;
    } = {}
  ): Promise<string> {
    const { temperature = 0.7, max_tokens = 4000, model = MODEL } = options;

    return withRetry(
      async () => {
        const response = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "FitFast",
          },
          body: JSON.stringify({ model, messages, temperature, max_tokens }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new AIGenerationError(
            `OpenRouter API error: ${response.status}`,
            "openrouter",
            new Error(error)
          );
        }

        const data: OpenRouterResponse = await response.json();

        if (!data.choices || data.choices.length === 0) {
          throw new AIGenerationError(
            "No response from OpenRouter",
            "openrouter"
          );
        }

        return data.choices[0].message.content;
      },
      {
        maxAttempts: 3,
        operationName: "openrouter-chat",
        shouldRetry: (error) => {
          // Only retry server errors and network failures, not client errors
          if (error instanceof AIGenerationError) {
            const message = error.message;
            // Don't retry 4xx errors (auth, invalid request, etc.)
            if (message.includes("400") || message.includes("401") ||
                message.includes("403") || message.includes("422")) {
              return false;
            }
          }
          return true; // Retry 5xx and network errors
        },
      }
    );
  }

  /**
   * Generate a completion with simple prompt (wrapper around chat).
   * Inherits retry logic from chat() method.
   */
  async complete(
    prompt: string,
    systemPrompt?: string,
    options?: { temperature?: number; max_tokens?: number }
  ): Promise<string> {
    const messages: OpenRouterMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    messages.push({ role: "user", content: prompt });

    return this.chat(messages, options);
  }
}
```

### Meal Plan Generator with Full Validation Pipeline
```typescript
// Source: src/lib/ai/meal-plan-generator.ts (Phase 4 update)
import { getOpenRouterClient } from "./openrouter";
import { validateMealPlanResponse } from "@/lib/validation";
import { AIGenerationError } from "@/lib/errors";
import * as Sentry from "@sentry/nextjs";

export async function generateMealPlan(
  params: MealPlanGenerationParams
): Promise<ValidatedMealPlan> {
  const { profile, assessment, checkIn, language, planDuration = 7 } = params;

  const systemPrompt = `...`; // (existing prompt)
  const userPrompt = `...`; // (existing prompt)

  const client = getOpenRouterClient();

  try {
    // Step 1: Call OpenRouter with retry (via client.complete)
    const rawResponse = await client.complete(userPrompt, systemPrompt, {
      temperature: 0.7,
      max_tokens: 6000,
    });

    // Step 2: Validate response with Zod (handles JSON.parse + schema check)
    // Throws ValidationError if invalid, logs to Sentry automatically
    const validatedPlan = validateMealPlanResponse(rawResponse);

    return validatedPlan;
  } catch (error) {
    // Add meal plan generation context to error
    Sentry.captureException(error, {
      tags: {
        feature: "meal-plan-generation",
        language,
      },
      extra: {
        userId: profile.id,
        planDuration,
        hasCheckIn: !!checkIn,
      },
    });

    // Re-throw with more specific error if needed
    if (error instanceof ValidationError) {
      throw new AIGenerationError(
        `AI generated invalid meal plan: ${error.message}`,
        "openrouter",
        error
      );
    }

    throw error; // RetryError, AIGenerationError, etc.
  }
}
```

### Extracted Supabase Query Function
```typescript
// Source: NEW - src/lib/supabase/queries/profiles.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { AppError } from "@/lib/errors";
import * as Sentry from "@sentry/nextjs";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Assessment = Database["public"]["Tables"]["initial_assessments"]["Row"];

/**
 * Fetch user profile by ID.
 * Throws AppError if not found.
 */
export async function getProfileById(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single<Profile>();

  if (error || !data) {
    Sentry.captureException(error || new Error("Profile not found"), {
      tags: { feature: "profile-query" },
      extra: { userId, errorCode: error?.code },
    });
    throw new AppError("Profile not found", "PROFILE_NOT_FOUND", { userId });
  }

  return data;
}

/**
 * Fetch user's initial assessment.
 * Throws AppError if not found.
 */
export async function getAssessmentByUserId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Assessment> {
  const { data, error } = await supabase
    .from("initial_assessments")
    .select("*")
    .eq("user_id", userId)
    .single<Assessment>();

  if (error || !data) {
    Sentry.captureException(error || new Error("Assessment not found"), {
      tags: { feature: "assessment-query" },
      extra: { userId, errorCode: error?.code },
    });
    throw new AppError("Assessment not found", "ASSESSMENT_NOT_FOUND", { userId });
  }

  return data;
}
```

### Using Extracted Queries in API Routes
```typescript
// Source: src/app/api/plans/meal/route.ts (Phase 4 update)
import { createClient } from "@/lib/supabase/server";
import { getProfileById, getAssessmentByUserId } from "@/lib/supabase/queries/profiles";
import { generateMealPlan } from "@/lib/ai/meal-plan-generator";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { checkInId, planDuration = 14 } = body;

    // Use extracted query functions (includes error handling + logging)
    const profile = await getProfileById(supabase, user.id);
    const assessment = await getAssessmentByUserId(supabase, user.id);

    // Generate meal plan (now with retry + validation)
    const validatedPlan = await generateMealPlan({
      profile,
      assessment,
      checkIn: checkIn || undefined,
      language: profile.language,
      planDuration,
    });

    // Save validated plan to database
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + planDuration);

    const { data: savedPlan, error: saveError } = await supabase
      .from("meal_plans")
      .insert({
        user_id: user.id,
        check_in_id: checkInId || null,
        plan_data: validatedPlan as any,
        language: profile.language,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
      } as any)
      .select()
      .single();

    if (saveError) {
      Sentry.captureException(saveError, {
        tags: { feature: "meal-plan-save" },
        extra: { userId: user.id, checkInId },
      });
      return NextResponse.json(
        { error: "Failed to save meal plan" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, mealPlan: savedPlan });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "meal-plan-generation" },
      extra: {
        userId: user?.id,
        timestamp: new Date().toISOString(),
      },
    });
    return NextResponse.json(
      { error: "Failed to generate meal plan" },
      { status: 500 }
    );
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bare fetch() with no retry | fetch() wrapped in exponential-backoff library | Phase 4 | Handles transient network failures automatically |
| Manual JSON.parse in generators | Zod validation with .safeParse() | Phase 3/4 | Type-safe validation + automatic Sentry logging |
| console.error() only | Sentry.captureException with context | Already in use | Centralized error tracking with context |
| Inline Supabase queries | Extracted query functions in lib/supabase/queries/ | Phase 4 | Reusable, typed, includes error handling |

**Deprecated/outdated:**
- **Direct JSON.parse in AI generators:** Use `validateMealPlanResponse()` / `validateWorkoutPlanResponse()` instead
- **Duplicate .from().select() queries:** Extract to `lib/supabase/queries/` with proper types and error handling
- **Silent .catch(() => {}):** Always log to Sentry with context, even for fire-and-forget operations

## Open Questions

1. **Should we add request timeouts to OpenRouter calls?**
   - What we know: `exponential-backoff` has `maxDelay` cap (5 seconds), but no overall timeout
   - What's unclear: Should we add AbortController with 30s timeout to prevent indefinite hangs?
   - Recommendation: Add 30-second timeout to prevent edge cases where API hangs indefinitely

2. **How should we handle partial validation failures?**
   - What we know: If AI generates 6/7 days correctly, Zod rejects entire plan
   - What's unclear: Should we salvage valid days and mark others as errors?
   - Recommendation: For MVP, reject entire plan if any validation fails. Phase 5+ could add partial recovery logic.

3. **Should extracted query functions use retry logic?**
   - What we know: Database queries can fail transiently (connection drops, timeouts)
   - What's unclear: Supabase client already has some retry logic - do we need to wrap queries in `withRetry()`?
   - Recommendation: Profile/assessment queries are not transient - avoid retry to prevent masking schema issues. Focus retry on external APIs only.

4. **How to handle Arabic language generation failures?**
   - What we know: Pending todo says AI generates English even when locale is Arabic
   - What's unclear: Is this a prompt engineering issue or model capability issue?
   - Recommendation: Phase 4 focuses on reliability infrastructure. Address Arabic generation in Phase 5 (API Routes) by improving prompts and adding post-generation language validation.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/lib/errors/retry.ts`, `src/lib/validation/*.ts`, `src/lib/ai/*.ts`
- exponential-backoff documentation: https://www.npmjs.com/package/exponential-backoff (v3.1.3)
- Zod documentation: https://zod.dev (v4.3.6)
- Sentry Next.js documentation: https://docs.sentry.io/platforms/javascript/guides/nextjs/

### Secondary (MEDIUM confidence)
- FitFast project roadmap: `.planning/ROADMAP.md` (Phase 4 requirements)
- Phase 3 plans: Custom error classes, retry utility, Zod schemas already implemented
- Supabase SSR documentation: https://supabase.com/docs/guides/auth/server-side/nextjs

### Tertiary (LOW confidence)
- None - all findings verified against codebase and official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and used in Phase 3
- Architecture: HIGH - Patterns verified in existing codebase (retry.ts, validation/*.ts)
- Pitfalls: MEDIUM - Based on common service layer issues + codebase inspection
- Code examples: HIGH - Derived from existing implementations + official docs

**Research date:** 2026-02-12
**Valid until:** 2026-03-15 (30 days - stable infrastructure libraries, slow-moving patterns)
