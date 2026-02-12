import { getOpenRouterClient } from "./openrouter";
import type { InitialAssessment, Profile, CheckIn } from "@/types/database";
import { validateWorkoutPlanResponse, type ValidatedWorkoutPlan } from "@/lib/validation";
import { AIGenerationError, ValidationError } from "@/lib/errors";
import * as Sentry from "@sentry/nextjs";

export interface WorkoutPlanGenerationParams {
  profile: Profile;
  assessment: InitialAssessment;
  checkIn?: CheckIn;
  language: "en" | "ar";
  planDuration?: number; // days
}

/** @deprecated Use ValidatedWorkoutPlan from @/lib/validation instead */
export interface GeneratedWorkoutPlan {
  weeklyPlan: {
    [day: string]: {
      workoutName: string;
      duration: number; // minutes
      targetMuscles: string[];
      warmup: {
        exercises: Array<{
          name: string;
          duration: number; // seconds
          instructions: string[];
        }>;
      };
      exercises: Array<{
        name: string;
        sets: number;
        reps: string; // e.g., "10-12" or "30 seconds"
        rest: number; // seconds
        notes?: string;
        targetMuscles: string[];
        equipment?: string;
      }>;
      cooldown: {
        exercises: Array<{
          name: string;
          duration: number; // seconds
          instructions: string[];
        }>;
      };
      restDay?: boolean;
    };
  };
  progressionNotes: string;
  safetyTips: string[];
}

export async function generateWorkoutPlan(
  params: WorkoutPlanGenerationParams
): Promise<ValidatedWorkoutPlan> {
  const { profile, assessment, checkIn, language, planDuration = 7 } = params;

  const isArabic = language === "ar";

  const systemPrompt = `You are an expert personal trainer and workout planning AI. Your task is to create personalized workout plans based on user profiles, assessments, and progress data.

IMPORTANT GUIDELINES:
1. Consider experience level and fitness goals
2. Account for any injuries or medical conditions
3. Respect the user's schedule availability
4. Progress exercises appropriately
5. Include warm-up and cool-down
6. Provide clear, safe instructions
7. Return ONLY valid JSON, no markdown formatting or code blocks
${isArabic ? `
ARABIC LANGUAGE REQUIREMENTS:
- ALL text content MUST be in Arabic language
- Exercise names MUST be in Arabic (e.g., "تمرين الضغط" not "Push-ups")
- Workout names MUST be in Arabic (e.g., "تمارين الجزء العلوي" not "Upper Body")
- Muscle group names MUST be in Arabic (e.g., "الصدر، الظهر" not "chest, back")
- Instructions MUST be in Arabic
- Notes and tips MUST be in Arabic
- Equipment names SHOULD be in Arabic where possible` : ""}`;

  const userPrompt = `Create a ${planDuration}-day workout plan ${isArabic ? "ENTIRELY IN ARABIC LANGUAGE" : "in English"} for a user with the following profile:

GOALS: ${assessment.goals}
CURRENT WEIGHT: ${assessment.current_weight}kg
HEIGHT: ${assessment.height}cm
EXPERIENCE LEVEL: ${assessment.experience_level}

SCHEDULE AVAILABILITY: ${JSON.stringify(assessment.schedule_availability)}

MEDICAL CONSIDERATIONS:
- Medical Conditions: ${assessment.medical_conditions?.join(", ") || "None"}
- Injuries: ${assessment.injuries?.join(", ") || "None"}
- Exercise History: ${assessment.exercise_history || "None"}

${checkIn ? `
RECENT CHECK-IN DATA:
- Current Weight: ${checkIn.weight}kg
- Workout Performance: ${checkIn.workout_performance || "N/A"}
- Energy Level: ${checkIn.energy_level}/10
- New Injuries: ${checkIn.new_injuries || "None"}
` : ""}

Return a JSON object with this exact structure:
{
  "weeklyPlan": {
    "monday": {
      "workoutName": "Upper Body Strength",
      "duration": 45,
      "targetMuscles": ["chest", "back", "shoulders"],
      "warmup": {
        "exercises": [
          {
            "name": "Exercise name",
            "duration": 60,
            "instructions": ["step 1", "step 2"]
          }
        ]
      },
      "exercises": [
        {
          "name": "Exercise name",
          "sets": 3,
          "reps": "10-12",
          "rest": 60,
          "notes": "Optional notes",
          "targetMuscles": ["chest"],
          "equipment": "dumbbells"
        }
      ],
      "cooldown": {
        "exercises": [
          {
            "name": "Stretch name",
            "duration": 30,
            "instructions": ["step 1"]
          }
        ]
      },
      "restDay": false
    }
  },
  "progressionNotes": "How to progress each week",
  "safetyTips": ["tip 1", "tip 2"]
}`;

  const client = getOpenRouterClient();

  try {
    const response = await client.complete(userPrompt, systemPrompt, {
      temperature: 0.7,
      max_tokens: 6000,
    });

    // Validate with Zod (handles JSON cleaning, parsing, and schema validation)
    const validatedPlan = validateWorkoutPlanResponse(response);
    return validatedPlan;
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        feature: "workout-plan-generation",
        language,
      },
      extra: {
        userId: profile.id,
        planDuration,
        hasCheckIn: !!checkIn,
        action: "generate-workout-plan",
        timestamp: new Date().toISOString(),
      },
    });

    // Wrap ValidationError in AIGenerationError for consistent error type
    if (error instanceof ValidationError) {
      throw new AIGenerationError(
        `AI generated invalid workout plan: ${error.message}`,
        "openrouter",
        error
      );
    }

    // RetryError, AIGenerationError bubble up as-is
    throw error;
  }
}
