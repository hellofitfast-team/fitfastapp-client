import { getOpenRouterClient } from "./openrouter";
import type { InitialAssessment, Profile, CheckIn } from "@/types/database";

export interface MealPlanGenerationParams {
  profile: Profile;
  assessment: InitialAssessment;
  checkIn?: CheckIn;
  language: "en" | "ar";
  planDuration?: number; // days
}

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
): Promise<GeneratedMealPlan> {
  const { profile, assessment, checkIn, language, planDuration = 7 } = params;

  const isArabic = language === "ar";

  const systemPrompt = `You are an expert nutritionist and meal planning AI specializing in ${isArabic ? "Middle Eastern and Egyptian cuisine" : "international cuisine"}. Your task is to create personalized meal plans based on user profiles, assessments, and progress data.

IMPORTANT GUIDELINES:
1. Consider food preferences, allergies, and dietary restrictions
2. Balance macronutrients appropriately for the user's goals
3. Provide realistic, achievable meal plans with locally available ingredients
4. Include specific measurements and clear instructions
5. Suggest alternatives for flexibility
6. Return ONLY valid JSON, no markdown formatting or code blocks
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
CURRENT WEIGHT: ${assessment.current_weight}kg
HEIGHT: ${assessment.height}cm
EXPERIENCE LEVEL: ${assessment.experience_level}

DIETARY PREFERENCES:
- Food Preferences: ${assessment.food_preferences?.join(", ") || "None"}
- Allergies: ${assessment.allergies?.join(", ") || "None"}
- Dietary Restrictions: ${assessment.dietary_restrictions?.join(", ") || "None"}

${checkIn ? `
RECENT CHECK-IN DATA:
- Current Weight: ${checkIn.weight}kg
- Energy Level: ${checkIn.energy_level}/10
- Sleep Quality: ${checkIn.sleep_quality}/10
- Dietary Adherence: ${checkIn.dietary_adherence}/10
- Notes: ${checkIn.notes || "None"}
` : ""}

Return a JSON object with this exact structure:
{
  "weeklyPlan": {
    "monday": {
      "meals": [
        {
          "name": "Meal name",
          "type": "breakfast|lunch|dinner|snack",
          "time": "HH:MM",
          "calories": 500,
          "protein": 30,
          "carbs": 50,
          "fat": 15,
          "ingredients": ["ingredient 1", "ingredient 2"],
          "instructions": ["step 1", "step 2"],
          "alternatives": ["alternative option"]
        }
      ],
      "dailyTotals": {
        "calories": 2000,
        "protein": 150,
        "carbs": 200,
        "fat": 60
      }
    }
  },
  "weeklyTotals": {
    "calories": 14000,
    "protein": 1050,
    "carbs": 1400,
    "fat": 420
  },
  "notes": "General notes and tips for the week"
}`;

  const client = getOpenRouterClient();

  try {
    const response = await client.complete(userPrompt, systemPrompt, {
      temperature: 0.7,
      max_tokens: 6000,
    });

    // Parse the JSON response
    const cleanedResponse = response
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const mealPlan: GeneratedMealPlan = JSON.parse(cleanedResponse);

    return mealPlan;
  } catch (error) {
    console.error("Meal plan generation error:", error);
    throw new Error("Failed to generate meal plan");
  }
}
