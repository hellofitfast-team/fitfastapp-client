import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MealPlan, WorkoutPlan } from "@/types/database";
import { AppError } from "@/lib/errors";
import * as Sentry from "@sentry/nextjs";

interface SaveMealPlanParams {
  userId: string;
  checkInId?: string | null;
  planData: any;
  language: string;
  startDate: string;
  endDate: string;
}

export async function saveMealPlan(
  supabase: SupabaseClient<Database>,
  params: SaveMealPlanParams
): Promise<MealPlan> {
  const { userId, checkInId, planData, language, startDate, endDate } = params;

  const { data, error } = await supabase
    .from("meal_plans")
    .insert(
      {
        user_id: userId,
        check_in_id: checkInId || null,
        plan_data: planData,
        language,
        start_date: startDate,
        end_date: endDate,
      } as never
    )
    .select()
    .single<MealPlan>();

  if (error || !data) {
    Sentry.captureException(error || new Error("Failed to save meal plan"), {
      tags: { feature: "meal-plan-save" },
      extra: { userId, errorCode: error?.code },
    });
    throw new AppError("Failed to save meal plan", "MEAL_PLAN_SAVE_FAILED", {
      userId,
    });
  }

  return data;
}

interface SaveWorkoutPlanParams {
  userId: string;
  checkInId?: string | null;
  planData: any;
  language: string;
  startDate: string;
  endDate: string;
}

export async function saveWorkoutPlan(
  supabase: SupabaseClient<Database>,
  params: SaveWorkoutPlanParams
): Promise<WorkoutPlan> {
  const { userId, checkInId, planData, language, startDate, endDate } = params;

  const { data, error } = await supabase
    .from("workout_plans")
    .insert(
      {
        user_id: userId,
        check_in_id: checkInId || null,
        plan_data: planData,
        language,
        start_date: startDate,
        end_date: endDate,
      } as never
    )
    .select()
    .single<WorkoutPlan>();

  if (error || !data) {
    Sentry.captureException(
      error || new Error("Failed to save workout plan"),
      {
        tags: { feature: "workout-plan-save" },
        extra: { userId, errorCode: error?.code },
      }
    );
    throw new AppError(
      "Failed to save workout plan",
      "WORKOUT_PLAN_SAVE_FAILED",
      {
        userId,
      }
    );
  }

  return data;
}
