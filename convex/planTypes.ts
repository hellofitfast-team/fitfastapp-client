/**
 * Shared type definitions for meal and workout plan data structures.
 * Used across AI generation, validation, mutations, and client rendering.
 */

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealAlternative extends Macros {
  name: string;
  type: string;
  ingredients: string[];
  instructions: string[];
}

export interface Meal extends MealAlternative {
  alternatives: MealAlternative[];
}

export interface MealDayPlan {
  meals: Meal[];
  dailyTotals: Macros;
}

export interface MealPlanData {
  dailyTargets?: Macros;
  weeklyPlan: Record<string, MealDayPlan>;
  notes?: string;
  validationWarnings?: Array<{ type: string; day?: string; message: string }>;
}
