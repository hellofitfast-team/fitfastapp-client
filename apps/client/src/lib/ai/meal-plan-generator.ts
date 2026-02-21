import { generateObject } from "ai";
import { getModel } from "./provider";
import type { InitialAssessment, Profile, CheckIn } from "@/types/convex";
import { MealPlanSchema, type ValidatedMealPlan } from "@/lib/validation";
import { AIGenerationError } from "@/lib/errors";
import * as Sentry from "@sentry/nextjs";

export interface MealPlanGenerationParams {
  profile: Profile;
  assessment: InitialAssessment;
  checkIn?: CheckIn;
  language: "en" | "ar";
  planDuration?: number; // days
}

/** @deprecated Use ValidatedMealPlan from @/lib/validation instead */
export interface GeneratedMealPlan {
  weeklyPlan: {
    [day: string]: {
      meals: Array<{
        name: string;
        type: "breakfast" | "lunch" | "dinner" | "snack";
        time: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        ingredients: string[];
        instructions: string[];
        alternatives?: string[];
      }>;
      dailyTotals: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
    };
  };
  weeklyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  notes: string;
}

export async function generateMealPlan(
  params: MealPlanGenerationParams
): Promise<ValidatedMealPlan> {
  const { profile, assessment, checkIn, language, planDuration = 7 } = params;

  const isArabic = language === "ar";

  const systemPrompt = `You are an expert nutritionist and meal planning AI specializing in ${isArabic ? "Middle Eastern and Egyptian cuisine" : "international cuisine"}. Your task is to create personalized meal plans based on user profiles, assessments, and progress data.

IMPORTANT GUIDELINES:
1. Consider food preferences, allergies, and dietary restrictions
2. Balance macronutrients appropriately for the user's goals
3. Provide realistic, achievable meal plans with locally available ingredients
4. Include specific measurements and clear instructions
5. Suggest alternatives for flexibility
${isArabic ? `
ARABIC LANGUAGE REQUIREMENTS:
- ALL text content MUST be in Arabic language
- Meal names MUST be in Arabic (e.g., "بيض مخفوق بالسبانخ" not "Scrambled Eggs with Spinach")
- Ingredients MUST be in Arabic (e.g., "٣ بيضات" not "3 eggs")
- Instructions MUST be in Arabic
- Notes MUST be in Arabic
- Focus on Egyptian/Middle Eastern cuisine and locally available ingredients
- Use Arabic numerals or spelled-out Arabic numbers` : ""}`;

  const userPrompt = `Create a ${planDuration}-day meal plan ${isArabic ? "ENTIRELY IN ARABIC LANGUAGE" : "in English"} for a user with the following profile:

GOALS: ${assessment.goals}
CURRENT WEIGHT: ${assessment.currentWeight}kg
HEIGHT: ${assessment.height}cm
EXPERIENCE LEVEL: ${assessment.experienceLevel}

DIETARY PREFERENCES:
- Food Preferences: ${assessment.foodPreferences?.join(", ") || "None"}
- Allergies: ${assessment.allergies?.join(", ") || "None"}
- Dietary Restrictions: ${assessment.dietaryRestrictions?.join(", ") || "None"}

${checkIn ? `
RECENT CHECK-IN DATA:
- Current Weight: ${checkIn.weight}kg
- Energy Level: ${checkIn.energyLevel}/10
- Sleep Quality: ${checkIn.sleepQuality}/10
- Dietary Adherence: ${checkIn.dietaryAdherence}/10
- Notes: ${checkIn.notes || "None"}
` : ""}`;

  try {
    const { object, usage } = await generateObject({
      model: getModel(),
      schema: MealPlanSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
      maxOutputTokens: 6000,
      maxRetries: 3,
    });

    Sentry.addBreadcrumb({
      category: "ai",
      message: "Meal plan generated",
      data: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
      },
      level: "info",
    });

    return object;
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        feature: "meal-plan-generation",
        language,
      },
      extra: {
        userId: profile._id,
        planDuration,
        hasCheckIn: !!checkIn,
        action: "generate-meal-plan",
        timestamp: new Date().toISOString(),
      },
    });

    throw new AIGenerationError(
      `Failed to generate meal plan: ${error instanceof Error ? error.message : String(error)}`,
      "openrouter",
      error instanceof Error ? error : undefined
    );
  }
}
