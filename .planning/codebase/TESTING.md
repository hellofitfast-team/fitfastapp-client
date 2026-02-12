# Testing Patterns

**Analysis Date:** 2026-02-12

## Test Framework

**Runner:**
- Vitest 4.0
- Config: Not yet created (test infrastructure in planning phase)
- Environment: jsdom

**Assertion Library:**
- Testing Library (via @testing-library/react 16.3)

**Run Commands:**
```bash
pnpm test              # Run all tests (when configured)
pnpm test:watch       # Watch mode (when configured)
pnpm test:coverage    # Coverage report (when configured)
```

**Note:** Test framework is referenced in MEMORY.md but not yet implemented in package.json. Project is pre-MVP and testing infrastructure is planned for Phase 2.

## Test File Organization

**Location:**
- To be determined (typically co-located next to source files)
- Pattern: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`

**Naming:**
- Match source filename with `.test` or `.spec` suffix
- Example: `meal-plan-generator.ts` → `meal-plan-generator.test.ts`

**Structure:**
```
src/
├── lib/
│   ├── ai/
│   │   ├── meal-plan-generator.ts
│   │   └── meal-plan-generator.test.ts
│   ├── supabase/
│   │   ├── server.ts
│   │   └── server.test.ts
├── hooks/
│   ├── use-profile.ts
│   └── use-profile.test.ts
└── components/
    ├── ui/
    │   ├── button.tsx
    │   └── button.test.tsx
```

## Test Structure

**Suite Organization:**
Will follow standard Vitest pattern (not yet implemented):

```typescript
// Expected pattern (from MEMORY.md testing notes)
describe("MealPlanGenerator", () => {
  describe("generateMealPlan", () => {
    it("should generate meal plan for Arabic language", () => {
      // Setup
      const params = { ... };

      // Execute
      const result = await generateMealPlan(params);

      // Assert
      expect(result.weeklyPlan).toBeDefined();
      expect(result.weeklyTotals.calories).toBeGreaterThan(0);
    });

    it("should throw error on API failure", () => {
      // Test error handling
    });
  });
});
```

**Patterns:**
- Use `describe()` blocks to organize by feature/module
- Use `it()` for individual test cases
- Clear test names following "should [action] [expected outcome]"
- Setup, Execute, Assert (AAA) pattern
- No complex setup — use fixtures/factories for test data

## Mocking

**Framework:** Vitest `vi` module

**Special Requirements:**
- **localStorage mock:** Node.js 22+ has built-in localStorage that conflicts with jsdom. Custom mock required in setup.ts
- **vi.hoisted():** Required when `vi.mock()` factory references variables — mocks are hoisted above imports

**Known Pattern from Memory:**
```typescript
// Example: Mocking with hoisted references
import { vi } from "vitest";

const mockData = { /* ... */ };

vi.hoisted(() => {
  return { mockData };
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({ ... }))
}));
```

**What to Mock:**
- External APIs (Supabase, OpenRouter, OneSignal)
- Browser APIs (localStorage, Notification, serviceWorker)
- Network requests (fetch)

**What NOT to Mock:**
- Utility functions (cn, date formatters)
- Custom hooks implementation (test their behavior)
- Component logic (test behavior, not implementation)

**Browser API Testing:**
- Use `"X" in obj` operator to check property existence, not truthiness
- Always pair with `&& obj.X` for APIs like `Notification`, `serviceWorker`
- Example: `if ("Notification" in window && window.Notification) { ... }`

## Fixtures and Factories

**Test Data:**
Will follow pattern (not yet implemented):

```typescript
// Example factory function structure
export function createMockProfile(overrides = {}): Profile {
  return {
    id: "test-user-123",
    full_name: "Test User",
    phone: null,
    language: "en",
    status: "active",
    plan_tier: "3_months",
    is_coach: false,
    ...overrides,
  };
}

export function createMockAssessment(overrides = {}): InitialAssessment {
  return {
    user_id: "test-user-123",
    goals: "weight_loss",
    current_weight: 90,
    height: 180,
    experience_level: "intermediate",
    food_preferences: ["chicken", "rice"],
    allergies: [],
    ...overrides,
  };
}

// Usage in tests
it("should generate plan", () => {
  const profile = createMockProfile({ language: "ar" });
  const assessment = createMockAssessment({ goals: "muscle_gain" });

  const result = await generateMealPlan({
    profile,
    assessment,
    language: "ar",
  });

  expect(result).toBeDefined();
});
```

**Location:**
- `src/__tests__/fixtures/` or co-locate in test files
- Export factory functions for reuse across test suites

## Coverage

**Requirements:**
- Not enforced in current setup (MVP phase)
- Minimum recommendations (for Phase 2): 70% for core business logic, 80% for critical paths
- AI generation, auth, and plan generation are high-priority for testing

**View Coverage:**
```bash
pnpm test:coverage     # When configured
# Output: coverage/ directory with HTML report
```

## Test Types

**Unit Tests:**
- Scope: Individual functions, hooks, components in isolation
- Approach: Test inputs and outputs with mocked dependencies
- Priority: Utility functions, hooks (useProfile, useMealPlans), API routes
- Example: Testing `generateMealPlan()` with mocked OpenRouter API

**Integration Tests:**
- Scope: Multiple modules interacting (hooks + components, API route + database)
- Approach: Mock external services, test data flow
- Priority: Check-in submission flow, plan generation + saving, authentication
- Example: Test full meal plan generation and database save

**E2E Tests:**
- Framework: Playwright 1.58 (infrastructure exists in `.playwright-mcp/`)
- Status: Available but not yet implemented
- Note: Pages behind Supabase middleware hang in Playwright — use `request.get()` on static assets instead
- Example: User login → submit check-in → view generated meal plan

## Common Patterns

**Async Testing:**
```typescript
// Hook with async fetch
it("should load profile data", async () => {
  const { result } = renderHook(() => useProfile());

  await waitFor(() => {
    expect(result.current.profile).toBeDefined();
  });
});

// Route handler
it("should generate meal plan", async () => {
  const request = new Request("http://localhost:3000/api/plans/meal", {
    method: "POST",
    body: JSON.stringify({ checkInId: "123" }),
  });

  const response = await POST(request);
  expect(response.status).toBe(200);
});
```

**Error Testing:**
```typescript
it("should throw on API failure", async () => {
  vi.mocked(OpenRouterClient.prototype.complete).mockRejectedValueOnce(
    new Error("API error")
  );

  await expect(
    generateMealPlan({ ... })
  ).rejects.toThrow("Failed to generate meal plan");
});

it("should return error response on missing profile", async () => {
  vi.mocked(supabase.from).mockReturnValueOnce({
    select: () => ({
      eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) })
    })
  });

  const response = await POST(request);
  expect(response.status).toBe(404);
  const data = await response.json();
  expect(data.error).toBe("Profile not found");
});
```

**Supabase Query Testing:**
```typescript
// Mock Supabase client
vi.mock("@/lib/supabase/client");

it("should fetch meal plans", async () => {
  const mockMealPlans = [
    { id: "1", user_id: "user-123", plan_data: {...} },
  ];

  vi.mocked(createClient).mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockMealPlans,
            error: null,
          })
        })
      })
    })
  });

  const { result } = renderHook(() => useMealPlans({ userId: "user-123" }));

  await waitFor(() => {
    expect(result.current.mealPlans).toEqual(mockMealPlans);
  });
});
```

**Component Testing:**
```typescript
it("should render button with correct variant", () => {
  const { getByRole } = render(
    <Button variant="destructive" size="lg">
      Delete
    </Button>
  );

  const button = getByRole("button", { name: "Delete" });
  expect(button).toHaveClass("bg-[#FF3B00]");
  expect(button).toHaveClass("h-14");
});

it("should show loading state", () => {
  const { getByRole } = render(
    <Button loading>
      Submit
    </Button>
  );

  const button = getByRole("button");
  expect(button).toBeDisabled();
  expect(button).toHaveClass("disabled:opacity-50");
});
```

## Current Testing Status

**Implemented:**
- ESLint configuration with Next.js defaults
- TypeScript strict mode (type safety as primary testing)
- Sentry error tracking (runtime error monitoring)
- Error boundaries for graceful failure

**Not Yet Implemented:**
- Unit tests (zero test files in src/)
- Integration test suite
- E2E test scenarios
- Coverage tracking

**Testing Infrastructure Available:**
- Vitest 4.0 (installed but not configured)
- Playwright 1.58 (infrastructure in `.playwright-mcp/`)
- @testing-library/react 16.3 (installed, ready to use)
- All necessary dependencies exist in package.json

**Recommended Next Steps for Phase 2:**
1. Create `vitest.config.ts` with jsdom environment and custom localStorage mock
2. Add `src/__tests__/setup.ts` with localStorage implementation
3. Create test fixtures in `src/__tests__/fixtures/`
4. Start with high-priority unit tests: AI generation, API routes, auth hooks
5. Add integration tests for critical user flows
6. Configure Playwright for E2E testing

---

*Testing analysis: 2026-02-12*
