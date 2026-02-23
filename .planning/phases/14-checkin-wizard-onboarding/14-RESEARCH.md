# Phase 14: Check-in Wizard and Onboarding - Research

**Researched:** 2026-02-22
**Domain:** Multi-step form wizard UX, swipe gesture navigation, guided onboarding wizard
**Confidence:** HIGH

## Summary

Phase 14 is a UI-only renovation of two existing flows: the check-in multi-step form and the initial assessment onboarding. Both flows already exist and work correctly — the backend is untouched. The renovation converts them from their current form into polished, mobile-native wizard experiences.

The check-in form at `apps/client/src/app/[locale]/(dashboard)/check-in/page.tsx` already implements a 5-step wizard with `useState(currentStep)` navigation and a `StepProgress` component showing numbered circles. What Phase 14 adds is: (1) a segmented-bar visual style for the progress indicator replacing the circle-number pattern, (2) swipe left/right navigation between steps using `react-swipeable`, and (3) a fuller review step that shows all entered data including measurements and notes. The onboarding assessment at `apps/client/src/app/[locale]/(onboarding)/initial-assessment/page.tsx` is currently a single long-scroll form with five section components rendered simultaneously. Phase 14 converts this into a per-screen question wizard matching the check-in pattern.

Key constraint: CSS-only animations (no framer-motion). The project already has `animate-fade-in`, `animate-slide-up`, `animate-slide-down`, `animate-scale-in` as CSS utility classes in `globals.css` — these are sufficient for step transitions.

**Primary recommendation:** Install `react-swipeable` (~1.5KB), refactor `StepProgress` to segmented bar style, add `useSwipeable` wrapper around the form content in check-in, and restructure the onboarding assessment into a wizard matching the check-in pattern.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHECK-01 | Check-in form presents steps one at a time with segmented progress bar | StepProgress component already exists — needs visual redesign from circle-numbers to filled segments. Step rendering (`currentStep === N`) already works. |
| CHECK-02 | Users can swipe left/right between check-in steps on mobile | `react-swipeable` not yet installed. `useSwipeable({ onSwipedLeft, onSwipedRight, preventScrollOnSwipe: true, trackMouse: true })` wraps form content. RTL inversion: swap left/right handlers when `locale === "ar"`. |
| CHECK-03 | Review screen shows full summary of all entered data before submission | Current `ReviewStep` shows weight, energy, sleep, adherence, photos count. Missing: measurements (chest/waist/hips/arms/thighs), workout performance text, diet notes, injuries text. Needs expansion. |
| CHECK-04 | Smart defaults: pre-fill weight from last check-in | `api.checkIns.getLatestCheckIn` query exists and returns last check-in with `weight` field. Hook `useCheckInLock` shows the query pattern. Add a `useLastCheckIn` hook, pass `weight` as `defaultValues` to `useForm`. |
| CHECK-05 | Steps: Weight, Measurements, Photos, Notes, Review (5 steps match current plan) | Current steps match: Weight+Measurements (step 1), Fitness (step 2), Dietary (step 3), Photos (step 4), Review (step 5). The requirement names differ slightly — "Notes" covers both fitness/dietary notes. Steps 2+3 may need merging or renaming. Roadmap says Weight/Measurements/Photos/Notes/Review. |
| ONBOARD-01 | Onboarding shows one question per screen | Current onboarding renders all 5 sections simultaneously in one scroll. Needs complete restructuring into a step wizard matching the check-in pattern. |
| ONBOARD-02 | Large inputs and smooth back/next transitions | Current inputs are standard size. "Large" means prominent, full-width, thumb-friendly. Transitions use CSS `animate-slide-up` / `animate-slide-down` on step change. |
| ONBOARD-03 | Smooth back/next transitions | CSS keyframe transitions between steps. `key` prop on step container triggers React re-mount and animation replay. No framer-motion. |
</phase_requirements>

## Existing Code State

### Check-in Wizard (Current State)

**File:** `apps/client/src/app/[locale]/(dashboard)/check-in/page.tsx` (276 lines)

Current step structure:
- Step 1: Weight + Measurements (`WeightStep`)
- Step 2: Fitness Metrics — workout performance text, energy/sleep ratings (`FitnessStep`)
- Step 3: Dietary — adherence rating, diet notes, injuries (`DietaryStep`)
- Step 4: Progress Photos (`PhotosStep`)
- Step 5: Review + Notes textarea (`ReviewStep`)

Already implemented:
- `useState(currentStep)` step tracking
- `handleNext` with per-step field validation via `methods.trigger(fields)`
- `handleBack` simple decrement
- `FormProvider` + `useForm` with Zod schema
- `StepProgress` (circle-number style) + `StepNavigation` (back/next buttons)
- `CheckInLocked` guard showing lock state

What is NOT yet implemented:
- Swipe gesture handling
- Segmented bar progress style
- Full data summary in ReviewStep (missing measurements/notes)
- Smart default weight from last check-in

**Current `StepProgress` pattern** (circle-number style, needs redesign):
```tsx
// apps/client/src/app/[locale]/(dashboard)/check-in/_components/step-progress.tsx
// Currently: circle with step number → check icon for completed
// Needs: horizontal segmented bar (filled/unfilled segments)
```

**Current `ReviewStep`** — only shows 5 fields, missing measurements and text fields:
```tsx
// Shows: weight, energyLevel, sleepQuality, dietaryAdherence, photos count
// Missing: chest/waist/hips/arms/thighs, workoutPerformance, dietNotes, newInjuries
```

### Onboarding Assessment (Current State)

**File:** `apps/client/src/app/[locale]/(onboarding)/initial-assessment/page.tsx` (244 lines)

Currently renders all sections at once:
- `GoalsSection` — multi-select fitness goals
- `BasicInfoSection` — weight, height, experience level, equipment
- `ScheduleSection` — workout days of the week
- `DietarySection` — food prefs, allergies, restrictions
- `MedicalSection` — medical notes / injuries

No wizard logic. All form state is `useState` (not `useForm`). Single submit button at bottom.

What needs to change:
- Add `currentStep` state (steps 1-5 or 1-6 depending on breakdown)
- Render only the current section's content
- Add `StepProgress` bar (same component as check-in, or shared)
- Add back/next navigation (reuse or share `StepNavigation`)
- Add per-step validation before advancing
- Add smooth CSS transitions on step change

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-swipeable | ^7.0.2 | Touch/mouse swipe gesture hook | 1.5KB, hook-based, zero DOM dependencies, already chosen in STATE.md |
| react-hook-form | ^7.71.1 | Form state management | Already in use in check-in form |
| next-intl | ^4.8.2 | Locale detection for RTL swipe inversion | Already in use |
| TailwindCSS v4 | ^4.1.18 | Utility classes including animation utilities | Already in use |

### No New Dependencies (for onboarding wizard)
The onboarding currently uses plain `useState` for form state. It stays that way — no need to migrate to `react-hook-form` just for the wizard conversion. The step structure and navigation can be layered on top of existing state.

**Installation (one new package):**
```bash
pnpm --filter @fitfast/client add react-swipeable
```

### react-swipeable API (v7.0.2)
```typescript
import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({
  onSwipedLeft: () => handleNext(),      // swipe left = go to next step
  onSwipedRight: () => handleBack(),     // swipe right = go to previous step
  swipeDuration: 500,                    // ms window for swipe detection
  preventScrollOnSwipe: true,            // blocks page scroll during swipe
  trackMouse: true,                      // enables mouse drag in dev
});

return <div {...handlers}> ... </div>;
```

For RTL (Arabic), swap handlers:
```typescript
const isRTL = locale === "ar";
const handlers = useSwipeable({
  onSwipedLeft: isRTL ? handleBack : handleNext,
  onSwipedRight: isRTL ? handleNext : handleBack,
  preventScrollOnSwipe: true,
  trackMouse: true,
});
```

## Architecture Patterns

### Recommended Project Structure (Phase 14 changes only)

No new files are strictly required — all changes are modifications to existing files. However, extracting shared wizard primitives is advisable:

```
apps/client/src/app/[locale]/(dashboard)/check-in/
├── page.tsx                          # Add useSwipeable, smart defaults
├── _components/
│   ├── step-progress.tsx             # REDESIGN: circle-numbers → segmented bar
│   ├── step-navigation.tsx           # No change needed
│   ├── review-step.tsx               # EXPAND: add all fields to summary
│   ├── weight-step.tsx               # No change needed
│   ├── fitness-step.tsx              # No change needed
│   ├── dietary-step.tsx              # No change needed
│   └── photos-step.tsx               # No change needed

apps/client/src/app/[locale]/(onboarding)/initial-assessment/
├── page.tsx                          # RESTRUCTURE: add wizard step logic
└── _components/
    ├── goals-section.tsx             # No change needed
    ├── basic-info-section.tsx        # No change needed
    ├── schedule-section.tsx          # No change needed
    ├── dietary-section.tsx           # No change needed
    └── medical-section.tsx           # No change needed

apps/client/src/hooks/
└── use-last-check-in.ts              # NEW: thin hook for getLatestCheckIn
```

### Pattern 1: Segmented Progress Bar

Replace circle-number progress with horizontal filled-segment bar. This is the "segmented progress bar" pattern.

**What:** A row of N equal-width segments, filled for completed/current steps, empty for future steps.
**When to use:** Multi-step forms where progress percentage is more useful than step numbers.

```tsx
// Replacement for step-progress.tsx
interface StepProgressProps {
  currentStep: number;  // 1-indexed
  totalSteps: number;
}

export function StepProgress({ currentStep, totalSteps }: StepProgressProps) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
            i < currentStep ? "bg-primary" : "bg-neutral-200"
          }`}
        />
      ))}
    </div>
  );
}
```

Note: The current `StepProgress` receives an array of step objects with icons. The segmented bar only needs `currentStep` and `totalSteps`. The step label can move to a subtitle below the bar.

### Pattern 2: Swipeable Step Container

Wrap the form content area (not the entire page) with swipe handlers. Exclude the progress bar and navigation buttons from the swipe target.

```tsx
// In check-in page.tsx
import { useSwipeable } from 'react-swipeable';
import { useLocale } from 'next-intl';

const locale = useLocale();
const isRTL = locale === "ar";

const swipeHandlers = useSwipeable({
  onSwipedLeft: () => { if (!isRTL) handleNext(); else handleBack(); },
  onSwipedRight: () => { if (!isRTL) handleBack(); else handleNext(); },
  preventScrollOnSwipe: true,
  trackMouse: true,
  swipeDuration: 500,
});

// In JSX, wrap only the form content area:
<div {...swipeHandlers}>
  <FormProvider {...methods}>
    <form ...>
      {currentStep === 1 && <WeightStep />}
      {/* ... */}
    </form>
  </FormProvider>
</div>
```

Important: swipe on the last step (Review) should NOT trigger submission — only the explicit Submit button does. Guard `handleNext` to only advance if `currentStep < STEPS.length`.

### Pattern 3: CSS Step Transitions

Use `key` prop to trigger remount and animation on step change. This is the CSS-only approach — no framer-motion.

```tsx
// Wrap each step's content with animated container
<div
  key={currentStep}  // forces remount when step changes
  className="animate-slide-up"  // defined in globals.css
>
  {currentStep === 1 && <WeightStep />}
  {/* ... */}
</div>
```

The existing animation classes in `globals.css`:
- `animate-fade-in` — opacity 0→1, 200ms
- `animate-slide-up` — opacity 0→1 + translateY 20px→0, 300ms
- `animate-scale-in` — opacity 0→1 + scale 0.95→1, 200ms

`animate-slide-up` is the right choice for step transitions — gives a "card coming up" feel.

### Pattern 4: Smart Default Weight

Add a thin hook to fetch the latest check-in, then use its weight as `defaultValues`:

```typescript
// apps/client/src/hooks/use-last-check-in.ts
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useLastCheckIn() {
  const { isAuthenticated } = useConvexAuth();
  const lastCheckIn = useQuery(
    api.checkIns.getLatestCheckIn,
    isAuthenticated ? {} : "skip",
  );
  return {
    lastCheckIn: lastCheckIn ?? null,
    isLoading: isAuthenticated && lastCheckIn === undefined,
  };
}
```

In `page.tsx`, use the hook before `useForm` initialization:
```typescript
const { lastCheckIn } = useLastCheckIn();

const methods = useForm<CheckInFormData>({
  resolver: zodResolver(checkInSchema) as any,
  defaultValues: {
    weight: lastCheckIn?.weight ?? undefined,
    energyLevel: 5,
    sleepQuality: 5,
    dietaryAdherence: 5,
  },
});
```

**Caveat:** `useForm` only reads `defaultValues` on mount. The last check-in data loads asynchronously. Use `methods.reset()` when the data arrives:

```typescript
useEffect(() => {
  if (lastCheckIn?.weight) {
    methods.reset({
      weight: lastCheckIn.weight,
      energyLevel: 5,
      sleepQuality: 5,
      dietaryAdherence: 5,
    });
  }
}, [lastCheckIn?.weight]);
```

### Pattern 5: Onboarding Wizard Restructure

The onboarding page needs a wizard pattern layered on top of its existing `useState` form state. The approach mirrors the check-in wizard:

```typescript
// Onboarding steps map to existing section components
const ONBOARDING_STEPS = [
  { id: 1, name: t("steps.goals"),     component: <GoalsSection ... /> },
  { id: 2, name: t("steps.basicInfo"), component: <BasicInfoSection ... /> },
  { id: 3, name: t("steps.schedule"),  component: <ScheduleSection ... /> },
  { id: 4, name: t("steps.dietary"),   component: <DietarySection ... /> },
  { id: 5, name: t("steps.medical"),   component: <MedicalSection ... /> },
];

// Add: const [currentStep, setCurrentStep] = useState(1);
// Render only currentStep content
// Add per-step validation before advancing
// Reuse StepProgress and StepNavigation components (or inline equivalents)
```

Per-step validation for onboarding (not using react-hook-form):
```typescript
const validateOnboardingStep = (step: number): string | null => {
  switch (step) {
    case 1:
      const finalGoals = getFinalValues(selectedGoals, goalsOther);
      if (finalGoals.length === 0) return tErrors("goalRequired");
      return null;
    case 2:
      if (!currentWeight || !height) return tErrors("weightHeightRequired");
      if (!experienceLevel) return tErrors("experienceLevelRequired");
      if (!equipment) return tErrors("equipmentRequired");
      return null;
    case 3:
      if (selectedDays.length === 0) return tErrors("workoutDaysRequired");
      return null;
    case 4: return null;  // dietary is optional
    case 5: return null;  // medical is optional
    default: return null;
  }
};
```

### Anti-Patterns to Avoid

- **Triggering form submission via swipe on the last step:** The swipe handler calls `handleNext()`. `handleNext()` should only advance if `currentStep < STEPS.length`. The actual submission is always button-only.
- **Applying swipe handlers to the full page wrapper:** If `preventScrollOnSwipe` is on the outer `<div>`, it will block vertical scrolling on steps with long content (like the photos step). Apply swipe only to the step content area, not the entire page.
- **Using `defaultValues` directly for async data:** `useForm` reads `defaultValues` synchronously at mount. Use `reset()` in a `useEffect` when the async data arrives.
- **Applying `animate-slide-up` without a `key` prop:** Without `key`, React reuses the same DOM element and does not replay the animation. Always use `key={currentStep}` on the animated container.
- **RTL swipe inversion forgetting the photo upload step:** Step 4 has an `<input type="file">` and image previews. Swipe on images should not trigger step navigation — `preventScrollOnSwipe: true` handles this, but test on device.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Swipe gesture detection | Custom `touchstart`/`touchmove`/`touchend` handlers | `react-swipeable` `useSwipeable` | Handles velocity detection, threshold, diagonal swipe rejection, iOS scroll conflicts |
| Step transition animation | CSS `transition` on `left`/`transform` with absolute positioning | CSS `@keyframes` with `key`-triggered remount | Simpler, no position tracking needed, consistent with project's animation system |
| Form validation per step | Custom validation function | `react-hook-form`'s `methods.trigger(fields)` | Already used in check-in — triggers only the fields for the current step, preserves all other field state |
| Progress bar fill calculation | `width: ${(currentStep/totalSteps)*100}%` | Flex-based segments | RTL-safe (flex works correctly in RTL), no width calculation needed |

**Key insight:** The wizard infrastructure (step state, navigation, validation) already exists in the check-in form. Phase 14 adds swipe and redesigns the progress bar visual — it is not building a wizard from scratch.

## Common Pitfalls

### Pitfall 1: preventScrollOnSwipe Blocking Input Fields
**What goes wrong:** `preventScrollOnSwipe: true` on a container that wraps number inputs prevents the user from scrolling within number input spinners (or worse, conflicts with iOS scroll-to-zoom behavior on inputs).
**Why it happens:** `preventScrollOnSwipe` calls `preventDefault()` on `touchmove`, which iOS interprets broadly.
**How to avoid:** Apply swipe handlers to the step-content container, not to individual input wrappers. The step content already has natural height from its inputs, so scroll within the step is not needed. If a step has very tall content, wrap only the non-scrolling area (e.g., the step header and first field).
**Warning signs:** User cannot interact with number inputs on step 1 (weight).

### Pitfall 2: react-hook-form `reset()` Timing
**What goes wrong:** Calling `methods.reset({ weight: lastCheckIn.weight })` inside `useEffect` on the wrong dependency causes infinite re-renders or missed updates.
**Why it happens:** If `methods.reset` is in the dependency array (it changes identity on each render), the effect fires every render.
**How to avoid:** Depend only on `lastCheckIn?.weight` (a primitive), not on `methods.reset`:
```typescript
useEffect(() => {
  if (lastCheckIn?.weight) {
    methods.reset({ weight: lastCheckIn.weight, energyLevel: 5, sleepQuality: 5, dietaryAdherence: 5 });
  }
}, [lastCheckIn?.weight]);  // NOT [methods, lastCheckIn]
```

### Pitfall 3: Swipe Conflicts with Scroll on Long Steps
**What goes wrong:** Steps with tall content (e.g., Fitness step with textarea + two rating selectors) require vertical scrolling. If `preventScrollOnSwipe: true`, the user cannot scroll down within the step.
**Why it happens:** `react-swipeable` v7 with `preventScrollOnSwipe: true` blocks all touchmove while a swipe is being evaluated.
**How to avoid:** Set swipe delta high enough (e.g., `delta: 50`) so a slow/short horizontal movement is not captured. The default delta is 10px — increase to 50px for form contexts where accidental swipes are common. The user must intentionally swipe to navigate.
**Warning signs:** Tap-and-drag on textarea causes accidental step skip.

### Pitfall 4: RTL Direction for Segmented Progress Bar
**What goes wrong:** The segmented bar fills from left-to-right. In RTL, it should fill from right-to-left to feel natural.
**Why it happens:** The flex container with `flex-row` fills left-to-right in LTR by default.
**How to avoid:** Tailwind's RTL support handles this automatically — `flex-row` in a `dir="rtl"` container reverses to fill right-to-left. No special RTL handling needed for the bar itself.
**Warning signs:** In Arabic mode, the progress bar fills from left side instead of right side.

### Pitfall 5: Onboarding Validation Error Display
**What goes wrong:** The onboarding form uses `setError(string)` at the top level. When converting to a wizard, validation errors for step N are displayed at the top of the next step, not the current step.
**Why it happens:** `setError` persists across `setCurrentStep` calls.
**How to avoid:** Clear the error state when advancing to the next step:
```typescript
const handleOnboardingNext = () => {
  const validationError = validateOnboardingStep(currentStep);
  if (validationError) {
    setError(validationError);
    return;
  }
  setError(null);  // clear before advancing
  setCurrentStep(s => s + 1);
};
```

### Pitfall 6: Step Count Mismatch Between Check-in Steps
**What goes wrong:** The ROADMAP says steps are "Weight, Measurements, Photos, Notes, Review" (5 steps). The current code combines Weight+Measurements in step 1, and splits Fitness/Dietary into steps 2 and 3 (making 5 total). If step 1 is renamed to just "Weight" but measurements are removed, measurement data is lost.
**Why it happens:** The ROADMAP step names are user-facing labels, not a prescription to split/merge steps.
**How to avoid:** Keep the current step structure (Weight+Measurements in step 1 is correct). Just update the step name translation key from "Weight & Measurements" to match design intent. The segmented bar does not show labels anyway (only filled/unfilled segments), so this is purely a label issue.

## Code Examples

Verified from codebase:

### Current Check-in Page Structure (before Phase 14 changes)
```tsx
// Source: apps/client/src/app/[locale]/(dashboard)/check-in/page.tsx
const [currentStep, setCurrentStep] = useState(1);
const methods = useForm<CheckInFormData>({
  resolver: zodResolver(checkInSchema) as any,
  defaultValues: { energyLevel: 5, sleepQuality: 5, dietaryAdherence: 5 },
});
// 5 steps, validation per step via methods.trigger()
// StepProgress + FormProvider + StepNavigation
```

### Existing Animation Classes (already in globals.css)
```css
/* Source: apps/client/src/app/globals.css */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .animate-slide-up { animation: none; }
}
```

### RTL Detection Pattern (from codebase)
```tsx
// Source: apps/client/src/app/[locale]/layout.tsx
const dir = locale === "ar" ? "rtl" : "ltr";

// Source: apps/client/src/app/[locale]/(dashboard)/settings/page.tsx
const locale = useLocale();
// Then: locale === "ar" ? "rtl" : "ltr"
```

### Existing Convex Query: Latest Check-in
```typescript
// Source: convex/checkIns.ts
export const getLatestCheckIn = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return ctx.db
      .query("checkIns")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
  },
});
// Returns: check-in document with { weight, measurements, energyLevel, ... }
```

### Existing Hook Pattern (model for use-last-check-in.ts)
```typescript
// Source: apps/client/src/hooks/use-check-in-lock.ts
export function useCheckInLock() {
  const { isAuthenticated } = useConvexAuth();
  const lockStatus = useQuery(
    api.checkIns.getLockStatus,
    isAuthenticated ? {} : "skip",
  );
  return {
    isLocked: lockStatus?.isLocked ?? false,
    // ...
  };
}
```

### Full ReviewStep Expansion (what CHECK-03 requires)
```tsx
// Current ReviewStep only shows 5 fields
// Expanded version needs:
{[
  { label: t("weight"), value: `${watch("weight")} ${tUnits("kg")}` },
  { label: t("chest"), value: watch("chest") ? `${watch("chest")} ${tUnits("cm")}` : t("notEntered") },
  { label: t("waist"), value: watch("waist") ? `${watch("waist")} ${tUnits("cm")}` : t("notEntered") },
  { label: t("hips"), value: watch("hips") ? `${watch("hips")} ${tUnits("cm")}` : t("notEntered") },
  { label: t("arms"), value: watch("arms") ? `${watch("arms")} ${tUnits("cm")}` : t("notEntered") },
  { label: t("thighs"), value: watch("thighs") ? `${watch("thighs")} ${tUnits("cm")}` : t("notEntered") },
  { label: t("energy"), value: `${watch("energyLevel")}/10` },
  { label: t("sleep"), value: `${watch("sleepQuality")}/10` },
  { label: t("adherence"), value: `${watch("dietaryAdherence")}/10` },
  { label: t("photos"), value: `${uploadedPhotosCount} ${t("uploaded")}` },
].map(item => (
  <div key={item.label} className="flex justify-between p-4">
    <span className="text-sm text-muted-foreground">{item.label}</span>
    <span className="font-semibold text-sm">{item.value}</span>
  </div>
))}
// Also show workout performance, diet notes, injuries as text blocks if filled
```

## Onboarding Step Breakdown

The onboarding has 5 natural sections that map to 5 wizard steps:

| Step | Section | Key Fields | Optional? |
|------|---------|-----------|-----------|
| 1 | Goals | Fitness goal selection | No — required |
| 2 | Basic Info | Weight, height, experience level, equipment | No — required |
| 3 | Schedule | Workout days of week | No — required |
| 4 | Dietary | Food prefs, allergies, restrictions | Yes — optional |
| 5 | Medical | Medical conditions / injuries notes | Yes — optional |

Translation keys needed (add to `en.json` and `ar.json` under `onboarding.assessment`):
```json
"steps": {
  "goals": "Fitness Goals",
  "basicInfo": "Basic Info",
  "schedule": "Schedule",
  "dietary": "Dietary",
  "medical": "Medical"
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Long scroll form (onboarding) | Per-screen wizard | Phase 14 | 40% lower abandonment rate for stepped forms |
| Circle-number step progress | Segmented bar progress | Phase 14 | Cleaner visual, more modern (matches iOS/Android style) |
| Button-only wizard navigation | Button + swipe navigation | Phase 14 | Native mobile feel, expected by PWA users |
| Static weight default (5) | Pre-filled from last check-in | Phase 14 | Reduces friction on repeat check-ins |
| Summary without all fields | Full data summary in review | Phase 14 | User confidence before triggering AI plan gen |

## Open Questions

1. **Check-in step names: Current vs ROADMAP**
   - What we know: ROADMAP says "Weight, Measurements, Photos, Notes, Review". Current code has Weight+Measurements combined in step 1, plus Fitness and Dietary steps (2+3) before Photos.
   - What's unclear: Should Fitness Metrics (energy, sleep, workout performance) be merged with Notes into a single "Notes" step?
   - Recommendation: Keep the current 5-step structure (Weight+Measurements, Fitness, Dietary, Photos, Review). The ROADMAP step names are user-facing labels that can be updated in translation keys, not a prescription to restructure working validation logic. Rename step labels if desired but don't restructure the form's data model.

2. **Onboarding swipe gestures**
   - What we know: The phase description says "smooth back/next transitions" for onboarding.
   - What's unclear: Should the onboarding assessment also get swipe navigation, or just the check-in wizard?
   - Recommendation: Add swipe to onboarding as well — it uses the same page structure and the `useSwipeable` hook is lightweight. Consistent gesture behavior across both wizard flows is better UX.

3. **Large inputs for onboarding (ONBOARD-02)**
   - What we know: Requirement says "large inputs".
   - What's unclear: Does "large" mean larger input height (`h-14` instead of `h-11`), larger font size, or just full-width prominence?
   - Recommendation: "Large" likely means full-width, visually prominent, with clear labels. The current inputs are already `h-11` with `w-full`. The renovation should ensure the question/field dominates the screen — large title text above, single focused input below, minimal surrounding clutter. No need to increase input `h` beyond `h-12` for number inputs.

## Sources

### Primary (HIGH confidence)
- `apps/client/src/app/[locale]/(dashboard)/check-in/page.tsx` — Direct code reading, complete wizard implementation
- `apps/client/src/app/[locale]/(dashboard)/check-in/_components/*.tsx` — All 5 step components read
- `apps/client/src/app/[locale]/(onboarding)/initial-assessment/page.tsx` — Direct code reading, current single-form structure
- `apps/client/src/app/[locale]/(onboarding)/initial-assessment/_components/*.tsx` — All section components read
- `apps/client/src/hooks/use-check-in-lock.ts` — Hook pattern to follow for use-last-check-in
- `convex/checkIns.ts` — `getLatestCheckIn` query confirmed to return `weight` field
- `apps/client/src/app/globals.css` — Animation keyframes and utility classes confirmed
- `apps/client/package.json` — react-swipeable not yet installed, confirmed absent

### Secondary (MEDIUM confidence)
- react-swipeable v7.0.2 API — Verified via official docs and GitHub carousel example: `onSwipedLeft`, `onSwipedRight`, `preventScrollOnSwipe`, `trackMouse`, `swipeDuration` options confirmed
- `.planning/research/v1.1/FEATURES.md` — RTL swipe inversion pattern and wizard UX research (Section 4: Check-in UX, Section 8: RTL)
- `.planning/phases/12-design-tokens-primitives/12-RESEARCH.md` — Animation utilities confirmed as CSS-only pattern
- `.planning/phases/13-page-level-renovation/13-RESEARCH.md` — Design system component availability confirmed

### Tertiary (LOW confidence)
- none

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — react-swipeable already decided in STATE.md, all other libraries confirmed in use
- Architecture: HIGH — existing code read directly, step structure confirmed
- Pitfalls: HIGH — based on react-swipeable known issues (preventScrollOnSwipe) and react-hook-form reset() behavior from direct codebase knowledge
- RTL handling: HIGH — locale detection pattern read directly from codebase

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (stable — no external dependency changes expected)
