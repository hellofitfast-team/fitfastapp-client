"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type {
  MealCompletion,
  WorkoutCompletion,
  DailyReflection,
  InsertTables,
  UpdateTables,
} from "@/types/database";

interface TrackingData {
  mealCompletions: MealCompletion[];
  workoutCompletions: WorkoutCompletion[];
  dailyReflection: DailyReflection | null;
}

const fetcher = async (
  key: string,
  userId: string,
  date: string
): Promise<TrackingData> => {
  const supabase = createClient();

  const [mealCompletionsResult, workoutCompletionsResult, reflectionResult] =
    await Promise.all([
      supabase
        .from("meal_completions")
        .select("*")
        .eq("user_id", userId)
        .eq("date", date),
      supabase
        .from("workout_completions")
        .select("*")
        .eq("user_id", userId)
        .eq("date", date),
      supabase
        .from("daily_reflections")
        .select("*")
        .eq("user_id", userId)
        .eq("date", date)
        .single(),
    ]);

  return {
    mealCompletions: mealCompletionsResult.data || [],
    workoutCompletions: workoutCompletionsResult.data || [],
    dailyReflection:
      reflectionResult.error && reflectionResult.error.code === "PGRST116"
        ? null
        : reflectionResult.data,
  };
};

export function useTracking(userId?: string, date?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId && date ? ["tracking", userId, date] : null,
    ([, uid, d]) => fetcher("tracking", uid, d)
  );

  return {
    trackingData: data || {
      mealCompletions: [],
      workoutCompletions: [],
      dailyReflection: null,
    },
    isLoading,
    error,
    refetch: mutate,
  };
}

export async function toggleMealCompletion(
  userId: string,
  mealPlanId: string,
  date: string,
  mealIndex: number,
  completed: boolean,
  notes?: string
): Promise<void> {
  const supabase = createClient();

  // Check if completion already exists
  const { data: existing, error: queryError } = await supabase
    .from("meal_completions")
    .select("id")
    .eq("user_id", userId)
    .eq("meal_plan_id", mealPlanId)
    .eq("date", date)
    .eq("meal_index", mealIndex)
    .maybeSingle();

  if (queryError && queryError.code !== "PGRST116") {
    throw queryError;
  }

  if (existing) {
    // Update existing
    const { error: updateError } = await supabase
      .from("meal_completions")
      // @ts-expect-error - Supabase types need regeneration
      .update({ completed, notes })
      // @ts-expect-error - Supabase types need regeneration
      .eq("id", existing.id);

    if (updateError) throw updateError;
  } else {
    // Create new
    // @ts-expect-error - Supabase types need regeneration
    const { error: insertError } = await supabase.from("meal_completions").insert({
      user_id: userId,
      meal_plan_id: mealPlanId,
      date,
      meal_index: mealIndex,
      completed,
      notes,
    });

    if (insertError) throw insertError;
  }
}

export async function toggleWorkoutCompletion(
  userId: string,
  workoutPlanId: string,
  date: string,
  workoutIndex: number,
  completed: boolean,
  notes?: string
): Promise<void> {
  const supabase = createClient();

  // Check if completion already exists
  const { data: existing, error: queryError } = await supabase
    .from("workout_completions")
    .select("id")
    .eq("user_id", userId)
    .eq("workout_plan_id", workoutPlanId)
    .eq("date", date)
    .eq("workout_index", workoutIndex)
    .maybeSingle();

  if (queryError && queryError.code !== "PGRST116") {
    throw queryError;
  }

  if (existing) {
    // Update existing
    const { error: updateError } = await supabase
      .from("workout_completions")
      // @ts-expect-error - Supabase types need regeneration
      .update({ completed, notes })
      // @ts-expect-error - Supabase types need regeneration
      .eq("id", existing.id);

    if (updateError) throw updateError;
  } else {
    // Create new
    // @ts-expect-error - Supabase types need regeneration
    const { error: insertError } = await supabase.from("workout_completions").insert({
      user_id: userId,
      workout_plan_id: workoutPlanId,
      date,
      workout_index: workoutIndex,
      completed,
      notes,
    });

    if (insertError) throw insertError;
  }
}

export async function saveDailyReflection(
  userId: string,
  date: string,
  reflection: string
): Promise<void> {
  const supabase = createClient();

  // Check if reflection already exists
  const { data: existing, error: queryError } = await supabase
    .from("daily_reflections")
    .select("id")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (queryError && queryError.code !== "PGRST116") {
    throw queryError;
  }

  if (existing) {
    // Update existing
    const { error: updateError } = await supabase
      .from("daily_reflections")
      // @ts-expect-error - Supabase types need regeneration
      .update({ reflection })
      // @ts-expect-error - Supabase types need regeneration
      .eq("id", existing.id);

    if (updateError) throw updateError;
  } else {
    // Create new
    // @ts-expect-error - Supabase types need regeneration
    const { error: insertError } = await supabase.from("daily_reflections").insert({
      user_id: userId,
      date,
      reflection,
    });

    if (insertError) throw insertError;
  }
}
