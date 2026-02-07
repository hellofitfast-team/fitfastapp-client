"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { Profile, MealPlan, WorkoutPlan, CheckIn, MealCompletion, WorkoutCompletion } from "@/types/database";
import type { GeneratedMealPlan } from "@/lib/ai/meal-plan-generator";
import type { GeneratedWorkoutPlan } from "@/lib/ai/workout-plan-generator";

interface DashboardData {
  profile: Profile | null;
  streak: number;
  mealProgress: {
    completed: number;
    total: number;
  };
  workoutProgress: {
    completed: number;
    total: number;
  };
  nextCheckInDays: number | null;
  todaysMeals: Array<{
    id: number;
    name: string;
    time: string;
    calories: number;
    done: boolean;
  }>;
  todaysWorkout: {
    name: string;
    type: string;
    duration: string;
    exercises: number;
    done: boolean;
  } | null;
}

const fetcher = async (
  key: string,
  userId: string
): Promise<DashboardData> => {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];

  // Fetch all data in parallel
  const [
    profileResult,
    checkInsResult,
    currentMealPlanResult,
    currentWorkoutPlanResult,
    mealCompletionsResult,
    workoutCompletionsResult,
    checkInFreqResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase
      .from("check_ins")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("meal_plans")
      .select("*")
      .eq("user_id", userId)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workout_plans")
      .select("*")
      .eq("user_id", userId)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("meal_completions")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today),
    supabase
      .from("workout_completions")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today),
    supabase
      .from("system_config")
      .select("value")
      .eq("key", "check_in_frequency_days")
      .single<{ value: string }>(),
  ]);

  const profile = profileResult.data;
  const checkIns: CheckIn[] = (checkInsResult.data as CheckIn[]) || [];
  const currentMealPlan: MealPlan | null = currentMealPlanResult.data as MealPlan | null;
  const currentWorkoutPlan: WorkoutPlan | null = currentWorkoutPlanResult.data as WorkoutPlan | null;
  const mealCompletions: MealCompletion[] = (mealCompletionsResult.data as MealCompletion[]) || [];
  const workoutCompletions: WorkoutCompletion[] = (workoutCompletionsResult.data as WorkoutCompletion[]) || [];

  // Calculate streak (consecutive days with check-ins)
  let streak = 0;
  if (checkIns.length > 0) {
    const sortedDates = checkIns.map((c) => new Date(c.created_at)).sort((a, b) => b.getTime() - a.getTime());
    streak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const diffDays = Math.floor(
        (sortedDates[i - 1].getTime() - sortedDates[i].getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
  }

  // Calculate next check-in days
  let nextCheckInDays: number | null = null;
  if (checkIns.length > 0 && profile) {
    const lastCheckIn = new Date(checkIns[0].created_at);
    const checkInFrequency = parseInt(checkInFreqResult.data?.value || "14");
    const nextCheckInDate = new Date(lastCheckIn);
    nextCheckInDate.setDate(nextCheckInDate.getDate() + checkInFrequency);
    const diffTime = nextCheckInDate.getTime() - new Date().getTime();
    nextCheckInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Parse today's meals from meal plan
  const todaysMeals: DashboardData["todaysMeals"] = [];
  if (currentMealPlan) {
    const mealPlanData = currentMealPlan.plan_data as unknown as GeneratedMealPlan;
    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayOfWeek = daysOfWeek[new Date().getDay()];
    const dayPlan = mealPlanData.weeklyPlan[dayOfWeek];

    if (dayPlan && dayPlan.meals) {
      dayPlan.meals.forEach((meal, index) => {
        const isCompleted = mealCompletions.some(
          (completion) =>
            completion.meal_plan_id === currentMealPlan.id &&
            completion.meal_index === index &&
            completion.completed
        );
        todaysMeals.push({
          id: index,
          name: meal.name,
          time: meal.time || "",
          calories: meal.calories || 0,
          done: isCompleted,
        });
      });
    }
  }

  // Parse today's workout from workout plan
  let todaysWorkout: DashboardData["todaysWorkout"] = null;
  if (currentWorkoutPlan) {
    const workoutPlanData = currentWorkoutPlan.plan_data as unknown as GeneratedWorkoutPlan;
    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayOfWeek = daysOfWeek[new Date().getDay()];
    const dayPlan = workoutPlanData.weeklyPlan[dayOfWeek];

    if (dayPlan && !dayPlan.restDay) {
      const isCompleted = workoutCompletions.some(
        (completion) =>
          completion.workout_plan_id === currentWorkoutPlan.id &&
          completion.workout_index === 0 &&
          completion.completed
      );

      todaysWorkout = {
        name: dayPlan.workoutName || "Workout",
        type: dayPlan.targetMuscles?.[0] || "Training",
        duration: `${dayPlan.duration || 45}M`,
        exercises: dayPlan.exercises?.length || 0,
        done: isCompleted,
      };
    }
  }

  // Calculate meal and workout progress
  const completedMeals = mealCompletions.filter((c) => c.completed).length;
  const totalMeals = todaysMeals.length;
  const completedWorkouts = workoutCompletions.filter((c) => c.completed).length;
  const totalWorkouts = todaysWorkout ? 1 : 0;

  return {
    profile,
    streak,
    mealProgress: {
      completed: completedMeals,
      total: totalMeals,
    },
    workoutProgress: {
      completed: completedWorkouts,
      total: totalWorkouts,
    },
    nextCheckInDays,
    todaysMeals,
    todaysWorkout,
  };
};

export function useDashboardData(userId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? ["dashboard", userId] : null,
    ([, uid]) => fetcher("dashboard", uid)
  );

  return {
    dashboardData: data || {
      profile: null,
      streak: 0,
      mealProgress: { completed: 0, total: 0 },
      workoutProgress: { completed: 0, total: 0 },
      nextCheckInDays: null,
      todaysMeals: [],
      todaysWorkout: null,
    },
    isLoading,
    error,
    refetch: mutate,
  };
}
