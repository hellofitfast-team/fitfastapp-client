"use client";

import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function useTracking(date: string) {
  const { isAuthenticated } = useConvexAuth();
  const data = useQuery(
    api.completions.getTrackingData,
    isAuthenticated ? { date } : "skip",
  );

  const toggleMealMutation = useMutation(api.completions.toggleMealCompletion);
  const toggleWorkoutMutation = useMutation(api.completions.toggleWorkoutCompletion);
  const saveReflectionMutation = useMutation(api.reflections.saveReflection);

  const toggleMealCompletion = async (
    mealPlanId: Id<"mealPlans">,
    mealIndex: number,
    completed: boolean,
  ) => {
    await toggleMealMutation({ mealPlanId, date, mealIndex, completed });
  };

  const toggleWorkoutCompletion = async (
    workoutPlanId: Id<"workoutPlans">,
    workoutIndex: number,
    completed: boolean,
  ) => {
    await toggleWorkoutMutation({ workoutPlanId, date, workoutIndex, completed });
  };

  const saveDailyReflection = async (reflection: string) => {
    await saveReflectionMutation({ date, reflection });
  };

  return {
    trackingData: data ?? {
      mealCompletions: [],
      workoutCompletions: [],
      reflection: null,
    },
    isLoading: isAuthenticated && data === undefined,
    error: null,
    toggleMealCompletion,
    toggleWorkoutCompletion,
    saveDailyReflection,
  };
}
