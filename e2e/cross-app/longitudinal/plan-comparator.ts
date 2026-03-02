/**
 * Plan Comparator — compares cycle-1 and cycle-2 AI-generated plans.
 *
 * Per RD-005 (research.md): Structural JSON diff of specific fields ensures
 * the AI personalised plans based on new check-in data, not just reformatted.
 *
 * At least one of (meal names, exercise list, calorie targets, macro ratios)
 * must differ between the two cycles. If all fields are identical, the test fails.
 */

export interface MealPlanData {
  meals?: Array<{ name?: string; calories?: number; [key: string]: unknown }>;
  totalCalories?: number;
  macros?: {
    protein?: number;
    carbs?: number;
    fat?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface WorkoutPlanData {
  exercises?: Array<{
    name?: string;
    sets?: number;
    reps?: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface PlanComparisonResult {
  differs: boolean;
  fields: string[];
  details: {
    field: string;
    cycle1Value: unknown;
    cycle2Value: unknown;
    changed: boolean;
  }[];
}

/**
 * Extract comparable meal names from a meal plan.
 */
function extractMealNames(plan: MealPlanData): string[] {
  if (!plan.meals || !Array.isArray(plan.meals)) return [];
  return plan.meals
    .map((m) => (m.name ?? "").toLowerCase().trim())
    .filter(Boolean)
    .sort();
}

/**
 * Extract exercise names from a workout plan.
 */
function extractExerciseNames(plan: WorkoutPlanData): string[] {
  if (!plan.exercises || !Array.isArray(plan.exercises)) return [];
  return plan.exercises
    .map((e) => (e.name ?? "").toLowerCase().trim())
    .filter(Boolean)
    .sort();
}

/**
 * Extract calorie target from a meal plan.
 */
function extractCalorieTarget(plan: MealPlanData): number | null {
  if (plan.totalCalories != null) return plan.totalCalories;
  if (plan.meals && Array.isArray(plan.meals)) {
    const total = plan.meals.reduce((sum, m) => sum + (m.calories ?? 0), 0);
    return total > 0 ? total : null;
  }
  return null;
}

/**
 * Extract macro ratios as a normalized string for comparison.
 */
function extractMacroRatios(plan: MealPlanData): Record<string, number> | null {
  if (!plan.macros) return null;
  const { protein, carbs, fat } = plan.macros;
  if (protein == null && carbs == null && fat == null) return null;
  return {
    protein: protein ?? 0,
    carbs: carbs ?? 0,
    fat: fat ?? 0,
  };
}

/**
 * Deep equality check for arrays of strings.
 */
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}

/**
 * Compare two meal plans structurally.
 */
export function compareMealPlans(cycle1: MealPlanData, cycle2: MealPlanData): PlanComparisonResult {
  const details: PlanComparisonResult["details"] = [];

  // Compare meal names
  const names1 = extractMealNames(cycle1);
  const names2 = extractMealNames(cycle2);
  const namesChanged = !arraysEqual(names1, names2);
  details.push({
    field: "mealNames",
    cycle1Value: names1,
    cycle2Value: names2,
    changed: namesChanged,
  });

  // Compare calorie targets
  const cal1 = extractCalorieTarget(cycle1);
  const cal2 = extractCalorieTarget(cycle2);
  const calChanged = cal1 !== cal2;
  details.push({
    field: "calorieTarget",
    cycle1Value: cal1,
    cycle2Value: cal2,
    changed: calChanged,
  });

  // Compare macro ratios
  const macros1 = extractMacroRatios(cycle1);
  const macros2 = extractMacroRatios(cycle2);
  const macrosChanged = JSON.stringify(macros1) !== JSON.stringify(macros2);
  details.push({
    field: "macroRatios",
    cycle1Value: macros1,
    cycle2Value: macros2,
    changed: macrosChanged,
  });

  const changedFields = details.filter((d) => d.changed).map((d) => d.field);

  return {
    differs: changedFields.length > 0,
    fields: changedFields,
    details,
  };
}

/**
 * Compare two workout plans structurally.
 */
export function compareWorkoutPlans(
  cycle1: WorkoutPlanData,
  cycle2: WorkoutPlanData,
): PlanComparisonResult {
  const details: PlanComparisonResult["details"] = [];

  // Compare exercise names
  const exercises1 = extractExerciseNames(cycle1);
  const exercises2 = extractExerciseNames(cycle2);
  const exercisesChanged = !arraysEqual(exercises1, exercises2);
  details.push({
    field: "exerciseList",
    cycle1Value: exercises1,
    cycle2Value: exercises2,
    changed: exercisesChanged,
  });

  return {
    differs: exercisesChanged,
    fields: exercisesChanged ? ["exerciseList"] : [],
    details,
  };
}

/**
 * Compare both meal and workout plans between two cycles.
 * Returns true if at least one field differs across either plan type.
 * This is the main entry point used by the longitudinal simulation (FR-018).
 */
export function comparePlans(
  cycle1: { mealPlan: MealPlanData; workoutPlan: WorkoutPlanData },
  cycle2: { mealPlan: MealPlanData; workoutPlan: WorkoutPlanData },
): PlanComparisonResult {
  const mealResult = compareMealPlans(cycle1.mealPlan, cycle2.mealPlan);
  const workoutResult = compareWorkoutPlans(cycle1.workoutPlan, cycle2.workoutPlan);

  const allDetails = [...mealResult.details, ...workoutResult.details];
  const allChangedFields = [...mealResult.fields, ...workoutResult.fields];

  return {
    differs: allChangedFields.length > 0,
    fields: allChangedFields,
    details: allDetails,
  };
}
