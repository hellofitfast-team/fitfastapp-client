import { z } from "zod";
import { cleanAIResponse } from "./meal-plan";
import { ValidationError } from "@/lib/errors";
import * as Sentry from "@sentry/nextjs";

/**
 * Zod schema for warmup exercises within a daily workout.
 * Matches the GeneratedWorkoutPlan.weeklyPlan[day].warmup.exercises[i] structure.
 */
export const WarmupExerciseSchema = z.object({
  name: z.string().min(1, "Warmup exercise name is required"),
  duration: z.number().positive("Warmup duration must be a positive number (seconds)"),
  instructions: z.array(z.string().min(1, "Instruction cannot be empty")).min(1, "At least one instruction is required"),
});

/**
 * Zod schema for main workout exercises.
 * Matches the GeneratedWorkoutPlan.weeklyPlan[day].exercises[i] structure.
 */
export const WorkoutExerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required"),
  sets: z.number().positive().int("Sets must be a positive integer"),
  reps: z.string().min(1, "Reps is required (e.g., '10-12' or '30 seconds')"),
  rest: z.number().nonnegative("Rest period must be non-negative (seconds)"),
  notes: z.string().optional(),
  targetMuscles: z.array(z.string().min(1, "Target muscle cannot be empty")).min(1, "At least one target muscle is required"),
  equipment: z.string().optional(),
});

/**
 * Zod schema for cooldown exercises within a daily workout.
 * Matches the GeneratedWorkoutPlan.weeklyPlan[day].cooldown.exercises[i] structure.
 */
export const CooldownExerciseSchema = z.object({
  name: z.string().min(1, "Cooldown exercise name is required"),
  duration: z.number().positive("Cooldown duration must be a positive number (seconds)"),
  instructions: z.array(z.string().min(1, "Instruction cannot be empty")).min(1, "At least one instruction is required"),
});

/**
 * Zod schema for a single day's workout.
 * Matches the GeneratedWorkoutPlan.weeklyPlan[day] structure.
 */
export const DailyWorkoutSchema = z.object({
  workoutName: z.string().min(1, "Workout name is required"),
  duration: z.number().positive("Workout duration must be positive (minutes)"),
  targetMuscles: z.array(z.string()),
  warmup: z.object({
    exercises: z.array(WarmupExerciseSchema),
  }),
  exercises: z.array(WorkoutExerciseSchema),
  cooldown: z.object({
    exercises: z.array(CooldownExerciseSchema),
  }),
  restDay: z.boolean().optional(),
});

/**
 * Zod schema for the complete workout plan.
 * Matches the GeneratedWorkoutPlan interface exactly.
 */
export const WorkoutPlanSchema = z.object({
  weeklyPlan: z.record(z.string(), DailyWorkoutSchema),
  progressionNotes: z.string(),
  safetyTips: z.array(z.string().min(1, "Safety tip cannot be empty")).min(1, "At least one safety tip is required"),
});

/**
 * Inferred TypeScript types from Zod schemas.
 * These are drop-in replacements for the existing GeneratedWorkoutPlan interface.
 */
export type ValidatedWarmupExercise = z.infer<typeof WarmupExerciseSchema>;
export type ValidatedWorkoutExercise = z.infer<typeof WorkoutExerciseSchema>;
export type ValidatedCooldownExercise = z.infer<typeof CooldownExerciseSchema>;
export type ValidatedDailyWorkout = z.infer<typeof DailyWorkoutSchema>;
export type ValidatedWorkoutPlan = z.infer<typeof WorkoutPlanSchema>;

/**
 * Validate an AI-generated workout plan response.
 * Cleans markdown wrappers, parses JSON, validates with Zod schema.
 *
 * @param rawResponse - Raw string response from OpenRouter API
 * @returns Validated and typed WorkoutPlan object
 * @throws ValidationError if JSON parsing or schema validation fails
 */
export function validateWorkoutPlanResponse(rawResponse: string): ValidatedWorkoutPlan {
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanAIResponse(rawResponse));
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "workout-plan-validation", stage: "json-parse" },
      extra: { rawResponse: rawResponse.substring(0, 500) },
    });
    throw new ValidationError(
      "Failed to parse workout plan JSON from AI response"
    );
  }

  const result = WorkoutPlanSchema.safeParse(parsed);
  if (!result.success) {
    Sentry.captureException(
      new ValidationError("Workout plan schema validation failed", result.error),
      {
        tags: { feature: "workout-plan-validation", stage: "schema" },
        extra: {
          errorCount: result.error.issues.length,
          issues: result.error.issues.slice(0, 5),
        },
      }
    );
    throw new ValidationError(
      `Invalid workout plan structure: ${result.error.issues.map(e => e.message).join(", ")}`,
      result.error
    );
  }

  return result.data;
}
