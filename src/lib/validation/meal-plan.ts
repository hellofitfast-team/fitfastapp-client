import { z } from "zod";
import { ValidationError } from "@/lib/errors";
import * as Sentry from "@sentry/nextjs";

/**
 * Strip markdown code block wrappers from AI responses.
 * OpenRouter models sometimes return ```json ... ``` despite "no markdown" in prompt.
 */
export function cleanAIResponse(raw: string): string {
  return raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}

/**
 * Zod schema for a single meal within a daily meal plan.
 * Matches the GeneratedMealPlan.weeklyPlan[day].meals[i] structure.
 */
export const MealSchema = z.object({
  name: z.string().min(1, "Meal name is required"),
  type: z.enum(["breakfast", "lunch", "dinner", "snack"], {
    message: "Meal type must be breakfast, lunch, dinner, or snack",
  }),
  time: z.string().min(1, "Meal time is required"),
  calories: z.number().positive("Calories must be a positive number"),
  protein: z.number().nonnegative("Protein must be non-negative"),
  carbs: z.number().nonnegative("Carbs must be non-negative"),
  fat: z.number().nonnegative("Fat must be non-negative"),
  ingredients: z.array(z.string().min(1, "Ingredient cannot be empty")).min(1, "At least one ingredient is required"),
  instructions: z.array(z.string().min(1, "Instruction cannot be empty")).min(1, "At least one instruction is required"),
  alternatives: z.array(z.string()).optional(),
});

/**
 * Zod schema for daily totals within a daily meal plan.
 */
export const DailyTotalsSchema = z.object({
  calories: z.number().positive("Daily calories must be positive"),
  protein: z.number().nonnegative("Daily protein must be non-negative"),
  carbs: z.number().nonnegative("Daily carbs must be non-negative"),
  fat: z.number().nonnegative("Daily fat must be non-negative"),
});

/**
 * Zod schema for a single day's meal plan.
 * Matches the GeneratedMealPlan.weeklyPlan[day] structure.
 */
export const DailyMealPlanSchema = z.object({
  meals: z.array(MealSchema).min(1, "At least one meal is required per day"),
  dailyTotals: DailyTotalsSchema,
});

/**
 * Zod schema for the complete meal plan.
 * Matches the GeneratedMealPlan interface exactly.
 */
export const MealPlanSchema = z.object({
  weeklyPlan: z.record(z.string(), DailyMealPlanSchema),
  weeklyTotals: z.object({
    calories: z.number().positive("Weekly calories must be positive"),
    protein: z.number().nonnegative("Weekly protein must be non-negative"),
    carbs: z.number().nonnegative("Weekly carbs must be non-negative"),
    fat: z.number().nonnegative("Weekly fat must be non-negative"),
  }),
  notes: z.string(),
});

/**
 * Inferred TypeScript types from Zod schemas.
 * These are drop-in replacements for the existing GeneratedMealPlan interface.
 */
export type ValidatedMeal = z.infer<typeof MealSchema>;
export type ValidatedDailyMealPlan = z.infer<typeof DailyMealPlanSchema>;
export type ValidatedMealPlan = z.infer<typeof MealPlanSchema>;

/**
 * Validate an AI-generated meal plan response.
 * Cleans markdown wrappers, parses JSON, validates with Zod schema.
 *
 * @param rawResponse - Raw string response from OpenRouter API
 * @returns Validated and typed MealPlan object
 * @throws ValidationError if JSON parsing or schema validation fails
 */
export function validateMealPlanResponse(rawResponse: string): ValidatedMealPlan {
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanAIResponse(rawResponse));
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "meal-plan-validation", stage: "json-parse" },
      extra: { rawResponse: rawResponse.substring(0, 500) },
    });
    throw new ValidationError(
      "Failed to parse meal plan JSON from AI response"
    );
  }

  const result = MealPlanSchema.safeParse(parsed);
  if (!result.success) {
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
