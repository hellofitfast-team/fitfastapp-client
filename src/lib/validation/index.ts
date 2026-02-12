/**
 * Validation utilities and Zod schemas for AI-generated plans.
 *
 * This module provides:
 * - Zod schemas for meal plans and workout plans
 * - Validation helpers that clean AI responses, parse JSON, and validate structure
 * - TypeScript types inferred from schemas (drop-in replacements for existing interfaces)
 *
 * @module lib/validation
 */

// Meal plan exports
export {
  MealSchema,
  DailyMealPlanSchema,
  DailyTotalsSchema,
  MealPlanSchema,
  validateMealPlanResponse,
  cleanAIResponse,
  type ValidatedMeal,
  type ValidatedDailyMealPlan,
  type ValidatedMealPlan,
} from "./meal-plan";

// Workout plan exports
export {
  WarmupExerciseSchema,
  WorkoutExerciseSchema,
  CooldownExerciseSchema,
  DailyWorkoutSchema,
  WorkoutPlanSchema,
  validateWorkoutPlanResponse,
  type ValidatedWarmupExercise,
  type ValidatedWorkoutExercise,
  type ValidatedCooldownExercise,
  type ValidatedDailyWorkout,
  type ValidatedWorkoutPlan,
} from "./workout-plan";
