---
phase: 03-hardening-foundation
plan: 02
subsystem: validation-error-ui
tags: [validation, zod, error-boundary, sentry, ai-response]
dependency-graph:
  requires:
    - Custom error classes from 03-01
  provides:
    - Zod schemas for meal/workout plans (MealPlanSchema, WorkoutPlanSchema)
    - Validate helpers (validateMealPlanResponse, validateWorkoutPlanResponse)
    - cleanAIResponse helper for markdown stripping
    - ErrorBoundary component with Sentry integration
  affects:
    - Phase 4 (Service Layer) - will use validation schemas for AI responses
    - Phase 5 (API Routes) - will use validation before DB save
    - Phase 8 (Error Handling UX) - will use ErrorBoundary for route segments
tech-stack:
  added: []
  patterns:
    - Zod .safeParse() for untrusted AI responses (never .parse())
    - ValidationError throwing with Zod error context
    - React class component for error boundaries
    - Sentry integration with componentStack context
    - Markdown code block cleaning before JSON parsing
key-files:
  created:
    - src/lib/validation/meal-plan.ts (MealPlanSchema, validateMealPlanResponse, cleanAIResponse)
    - src/lib/validation/workout-plan.ts (WorkoutPlanSchema, validateWorkoutPlanResponse)
    - src/lib/validation/index.ts (barrel exports)
    - src/components/errors/ErrorBoundary.tsx (reusable error boundary)
  modified: []
decisions:
  - Use standard Tailwind red colors (red-50, red-200, etc.) for ErrorBoundary default UI instead of semantic error-* classes
  - cleanAIResponse helper strips both ```json and ``` wrappers to handle varied AI response formats
  - Zod schemas export inferred types as drop-in replacements for existing GeneratedMealPlan/GeneratedWorkoutPlan interfaces
metrics:
  duration: 180s
  completed: 2026-02-12T16:55:26Z
---

# Phase 03 Plan 02: Validation Schemas and Error Boundary

**One-liner:** Zod validation schemas matching AI plan interfaces exactly with safeParse-only usage, plus reusable ErrorBoundary component with Sentry integration and styled fallback UI.

## What Was Built

Created validation infrastructure for AI-generated plans and reusable error boundary component:

1. **Meal Plan Validation** (`src/lib/validation/meal-plan.ts`):
   - **MealPlanSchema**: Matches GeneratedMealPlan interface exactly (weeklyPlan with day records, meals array, dailyTotals, weeklyTotals, notes)
   - **MealSchema**: Individual meal with name, type (enum), time, macros, ingredients, instructions, alternatives
   - **DailyMealPlanSchema**: Single day's meals with daily totals
   - **cleanAIResponse()**: Strips markdown code block wrappers (```json and ```) before JSON parsing
   - **validateMealPlanResponse()**: Full pipeline - clean -> parse JSON -> safeParse -> throw ValidationError with Sentry context

2. **Workout Plan Validation** (`src/lib/validation/workout-plan.ts`):
   - **WorkoutPlanSchema**: Matches GeneratedWorkoutPlan interface exactly (weeklyPlan, progressionNotes, safetyTips)
   - **WarmupExerciseSchema**: name, duration (seconds), instructions array
   - **WorkoutExerciseSchema**: name, sets (int), reps (string), rest (seconds), notes, targetMuscles, equipment
   - **CooldownExerciseSchema**: Same structure as warmup exercises
   - **DailyWorkoutSchema**: workoutName, duration (minutes), targetMuscles, warmup/exercises/cooldown objects, optional restDay
   - **validateWorkoutPlanResponse()**: Same pipeline pattern as meal plan validation

3. **Barrel Exports** (`src/lib/validation/index.ts`):
   - Re-exports all schemas, validate helpers, and inferred types
   - Clean imports: `import { validateMealPlanResponse, MealPlanSchema } from "@/lib/validation"`

4. **ErrorBoundary Component** (`src/components/errors/ErrorBoundary.tsx`):
   - React class component with "use client" directive
   - Catches rendering errors in child components
   - `getDerivedStateFromError()`: Updates state when error caught
   - `componentDidCatch()`: Reports to Sentry with componentStack, calls custom onError handler
   - `reset()`: Resets state to retry rendering
   - Default styled fallback UI using Tailwind red colors (red-50, red-200, red-600, red-700, red-900)
   - Supports custom fallback via render prop: `fallback={(error, reset) => <CustomUI />}`
   - Supports custom error handler: `onError={(error, errorInfo) => { ... }}`

## Technical Implementation

**Validation Pipeline Pattern:**
```typescript
export function validateMealPlanResponse(rawResponse: string): ValidatedMealPlan {
  // Step 1: Clean markdown wrappers
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanAIResponse(rawResponse));
  } catch (error) {
    // Log to Sentry with context
    Sentry.captureException(error, {
      tags: { feature: "meal-plan-validation", stage: "json-parse" },
      extra: { rawResponse: rawResponse.substring(0, 500) },
    });
    throw new ValidationError("Failed to parse meal plan JSON from AI response");
  }

  // Step 2: Validate with Zod schema (safeParse only)
  const result = MealPlanSchema.safeParse(parsed);
  if (!result.success) {
    // Log to Sentry with Zod issues
    Sentry.captureException(
      new ValidationError("Meal plan schema validation failed", result.error),
      {
        tags: { feature: "meal-plan-validation", stage: "schema" },
        extra: {
          errorCount: result.error.issues.length,
          issues: result.error.issues.slice(0, 5),
        },
      }
    );
    throw new ValidationError(
      `Invalid meal plan structure: ${result.error.issues.map(e => e.message).join(", ")}`,
      result.error
    );
  }

  return result.data;
}
```

**Schema Structure Example (Meal Plan):**
```typescript
export const MealPlanSchema = z.object({
  weeklyPlan: z.record(z.string(), DailyMealPlanSchema),
  weeklyTotals: z.object({
    calories: z.number().positive(),
    protein: z.number().nonnegative(),
    carbs: z.number().nonnegative(),
    fat: z.number().nonnegative(),
  }),
  notes: z.string(),
});

// Inferred type is drop-in replacement for GeneratedMealPlan
export type ValidatedMealPlan = z.infer<typeof MealPlanSchema>;
```

**ErrorBoundary Integration:**
```typescript
componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
  // Capture to Sentry with React component stack
  Sentry.captureException(error, {
    contexts: {
      react: {
        componentStack: errorInfo.componentStack,
      },
    },
  });

  // Call custom error handler if provided
  this.props.onError?.(error, errorInfo);
}
```

**Sentry Integration Points:**
- **Validation failures**: Two-stage tracking (JSON parse vs. schema validation)
- **Component errors**: Automatic capture with componentStack in ErrorBoundary
- **Error context**: Feature tags, stage tags, error counts, and sample issues

## Deviations from Plan

None - plan executed exactly as written.

## Usage Examples for Phase 4/5

**Validating AI meal plan response:**
```typescript
import { validateMealPlanResponse } from "@/lib/validation";

try {
  const mealPlan = validateMealPlanResponse(aiResponse);
  // mealPlan is typed as ValidatedMealPlan (matches GeneratedMealPlan)
  await saveMealPlanToDatabase(mealPlan);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation failure (log, retry, notify coach)
    console.error("AI generated invalid meal plan:", error.message);
  }
}
```

**Wrapping route segments with ErrorBoundary:**
```tsx
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <DashboardShell>
        {children}
      </DashboardShell>
    </ErrorBoundary>
  );
}
```

**Custom fallback UI:**
```tsx
<ErrorBoundary
  fallback={(error, reset) => (
    <div className="p-4">
      <h2>Failed to load meal plan</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Retry</button>
    </div>
  )}
>
  <MealPlanView />
</ErrorBoundary>
```

## Verification Results

**TypeScript compilation:** ✓ Zero errors
**Files created:**
- ✓ src/lib/validation/meal-plan.ts
- ✓ src/lib/validation/workout-plan.ts
- ✓ src/lib/validation/index.ts
- ✓ src/components/errors/ErrorBoundary.tsx

**Schema structure verification:**
- ✓ MealPlanSchema matches GeneratedMealPlan interface
- ✓ WorkoutPlanSchema matches GeneratedWorkoutPlan interface
- ✓ All fields have proper types and validation rules
- ✓ Optional fields marked with `.optional()`

**safeParse usage:**
- ✓ No `.parse()` calls found (only JSON.parse for string parsing)
- ✓ Both validate helpers use `.safeParse()` for Zod validation
- ✓ Proper error handling with ValidationError throwing

**ErrorBoundary verification:**
- ✓ "use client" directive present
- ✓ Sentry.captureException called in componentDidCatch
- ✓ ComponentStack context passed to Sentry
- ✓ Default fallback uses standard Tailwind red colors (no semantic error-* classes)
- ✓ Reset mechanism implemented

**Barrel exports:**
- ✓ All schemas exported from index.ts
- ✓ All validate helpers exported
- ✓ All inferred types exported
- ✓ cleanAIResponse helper exported

## Next Steps

**Phase 4 (Service Layer)** will:
1. Import validation schemas from `@/lib/validation`
2. Wrap AI API responses with `validateMealPlanResponse()` / `validateWorkoutPlanResponse()`
3. Catch ValidationError and handle appropriately (retry AI generation, log to coach, etc.)
4. Use validated types for type-safe database operations

**Phase 5 (API Routes)** will:
1. Use validation helpers before saving AI-generated plans to database
2. Return structured error responses based on ValidationError details
3. Log validation failures to Sentry for monitoring AI quality

**Phase 8 (Error Handling UX)** will:
1. Wrap route segments with ErrorBoundary component
2. Implement custom fallback UIs for specific page types
3. Add error recovery flows (retry, refresh, navigate home)
4. Monitor error rates via Sentry dashboard

## Self-Check: PASSED

**Created files verified:**
```
FOUND: src/lib/validation/meal-plan.ts
FOUND: src/lib/validation/workout-plan.ts
FOUND: src/lib/validation/index.ts
FOUND: src/components/errors/ErrorBoundary.tsx
```

**Commits verified:**
```
FOUND: 20b8cd0 (Task 1: Validation schemas and helpers)
FOUND: 58463c4 (Task 2: ErrorBoundary component)
```

**Schema exports verified:**
- meal-plan.ts: MealPlanSchema, MealSchema, DailyMealPlanSchema, validateMealPlanResponse, cleanAIResponse ✓
- workout-plan.ts: WorkoutPlanSchema, WorkoutExerciseSchema, etc., validateWorkoutPlanResponse ✓
- index.ts: re-exports all schemas, types, and helpers ✓

**Implementation details verified:**
- safeParse used exclusively for Zod validation ✓
- ValidationError imported from @/lib/errors ✓
- Sentry.captureException in validation helpers ✓
- Sentry.captureException in ErrorBoundary.componentDidCatch ✓
- Standard Tailwind red classes (not semantic error-*) ✓
