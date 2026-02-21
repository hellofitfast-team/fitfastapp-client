import { generateObject } from "ai";
import { getModel } from "./provider";
import type { InitialAssessment, Profile, CheckIn } from "@/types/convex";
import { WorkoutPlanSchema, type ValidatedWorkoutPlan } from "@/lib/validation";
import { AIGenerationError } from "@/lib/errors";
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
CURRENT WEIGHT: ${assessment.currentWeight}kg
HEIGHT: ${assessment.height}cm
EXPERIENCE LEVEL: ${assessment.experienceLevel}

SCHEDULE AVAILABILITY: ${JSON.stringify(assessment.scheduleAvailability)}

MEDICAL CONSIDERATIONS:
- Medical Conditions: ${assessment.medicalConditions?.join(", ") || "None"}
- Injuries: ${assessment.injuries?.join(", ") || "None"}
- Exercise History: ${assessment.exerciseHistory || "None"}

${checkIn ? `
RECENT CHECK-IN DATA:
- Current Weight: ${checkIn.weight}kg
- Workout Performance: ${checkIn.workoutPerformance || "N/A"}
- Energy Level: ${checkIn.energyLevel}/10
- New Injuries: ${checkIn.newInjuries || "None"}
` : ""}`;

  try {
    const { object, usage } = await generateObject({
      model: getModel(),
      schema: WorkoutPlanSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
      maxOutputTokens: 6000,
      maxRetries: 3,
    });

    Sentry.addBreadcrumb({
      category: "ai",
      message: "Workout plan generated",
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
        feature: "workout-plan-generation",
        language,
      },
      extra: {
        userId: profile._id,
        planDuration,
        hasCheckIn: !!checkIn,
        action: "generate-workout-plan",
        timestamp: new Date().toISOString(),
      },
    });

    throw new AIGenerationError(
      `Failed to generate workout plan: ${error instanceof Error ? error.message : String(error)}`,
      "openrouter",
      error instanceof Error ? error : undefined
    );
  }
}
