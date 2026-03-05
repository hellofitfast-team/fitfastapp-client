/**
 * Deterministic nutrition calculation engine.
 * Uses Mifflin-St Jeor equation for BMR, activity multipliers for TDEE,
 * and ISSN macronutrient guidelines for protein/carbs/fat targets.
 *
 * This runs in code (not the LLM) because LLMs can't do math reliably.
 */

import { NUTRITION } from "./constants";

export type ActivityLevel = "sedentary" | "lightly_active" | "moderately_active" | "very_active";

interface NutritionInput {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: "male" | "female";
  trainingDaysPerWeek: number;
  goal: string; // "weight_loss" | "muscle_gain" | "body_recomposition" | "general_fitness" | etc.
  activityLevel?: ActivityLevel;
}

export interface NutritionTargets {
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  proteinPerKg: number;
  minCalories: number;
}

/**
 * Mifflin-St Jeor BMR equation (most accurate for general population).
 * Male:   10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5
 * Female: 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161
 */
function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: "male" | "female",
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === "male" ? base + 5 : base - 161;
}

/**
 * Lifestyle-based activity multiplier (independent of training).
 */
function getLifestyleMultiplier(activityLevel?: ActivityLevel): number {
  switch (activityLevel) {
    case "sedentary":
      return 1.2;
    case "lightly_active":
      return 1.375;
    case "moderately_active":
      return 1.55;
    case "very_active":
      return 1.725;
    default:
      return 1.375; // Default to lightly_active if not specified
  }
}

/**
 * Blended activity multiplier combining lifestyle activity + training days.
 *
 * baseMultiplier = lifestyle activity level (desk job vs physical labor)
 * exerciseBonus  = trainingDaysPerWeek * 0.05
 * total          = base + bonus, capped at 1.9
 *
 * This separates "how active is your daily life" from "how many days you train"
 * for more accurate TDEE. A desk worker training 4x/week: 1.2 + 0.2 = 1.4
 * vs the old flat 1.55 — a significant difference.
 */
function getActivityMultiplier(trainingDaysPerWeek: number, activityLevel?: ActivityLevel): number {
  const baseMultiplier = getLifestyleMultiplier(activityLevel);
  const exerciseBonus = trainingDaysPerWeek * NUTRITION.exerciseBonusPerDay;
  return Math.min(NUTRITION.maxActivityMultiplier, baseMultiplier + exerciseBonus);
}

/**
 * Map goal string to a calorie adjustment factor.
 */
function getGoalMultiplier(goal: string): number {
  const normalized = goal.toLowerCase().replace(/[\s_-]/g, "");
  if (
    normalized.includes("weightloss") ||
    normalized.includes("fatloss") ||
    normalized.includes("cutting")
  ) {
    return NUTRITION.goalMultipliers.deficit;
  }
  if (
    normalized.includes("musclegain") ||
    normalized.includes("bulking") ||
    normalized.includes("massbuilding")
  ) {
    return NUTRITION.goalMultipliers.surplus;
  }
  // body_recomposition, general_fitness, maintenance, etc.
  return NUTRITION.goalMultipliers.maintenance;
}

/**
 * Protein per kg based on goal (ISSN position stand guidelines).
 * - Weight loss / cutting: 2.0-2.2 g/kg (higher to preserve muscle)
 * - Muscle gain: 1.6-2.0 g/kg
 * - General: 1.6-1.8 g/kg
 */
function getProteinPerKg(goal: string): number {
  const normalized = goal.toLowerCase().replace(/[\s_-]/g, "");
  if (
    normalized.includes("weightloss") ||
    normalized.includes("fatloss") ||
    normalized.includes("cutting")
  ) {
    return NUTRITION.proteinPerKg.cutting;
  }
  if (normalized.includes("musclegain") || normalized.includes("bulking")) {
    return NUTRITION.proteinPerKg.bulking;
  }
  return NUTRITION.proteinPerKg.general;
}

export function calculateNutritionTargets(input: NutritionInput): NutritionTargets {
  const { weightKg, heightCm, age, gender, trainingDaysPerWeek, goal, activityLevel } = input;

  const bmr = Math.round(calculateBMR(weightKg, heightCm, age, gender));
  const activityMultiplier = getActivityMultiplier(trainingDaysPerWeek, activityLevel);
  const tdee = Math.round(bmr * activityMultiplier);

  const goalMultiplier = getGoalMultiplier(goal);
  const minCalories = gender === "male" ? NUTRITION.minCalories.male : NUTRITION.minCalories.female;
  const calories = Math.max(minCalories, Math.round(tdee * goalMultiplier));

  // Macros (ISSN guidelines)
  const proteinPerKg = getProteinPerKg(goal);
  const protein = Math.round(weightKg * proteinPerKg);
  let fat = Math.round(weightKg * NUTRITION.fatPerKg);

  // Guard: if protein + fat exceed calorie budget, scale fat down (preserve protein for muscle)
  let remainingCalories = calories - protein * 4 - fat * 9;
  if (remainingCalories < 0) {
    // Minimum fat: 0.5g/kg for hormonal health
    const minFatG = Math.round(weightKg * 0.5);
    const maxFatCalories = calories - protein * 4 - NUTRITION.minCarbsG * 4;
    fat = Math.max(minFatG, Math.round(maxFatCalories / 9));
    remainingCalories = calories - protein * 4 - fat * 9;
    console.warn(
      `[NutritionEngine] Fat scaled down to ${fat}g — protein+fat exceeded calorie target of ${calories}`,
    );
  }

  // Carbs fill remaining calories: (calories - protein*4 - fat*9) / 4
  const carbs = Math.max(NUTRITION.minCarbsG, Math.round(remainingCalories / 4));

  return { bmr, tdee, calories, protein, carbs, fat, proteinPerKg, minCalories };
}
