"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useWorkoutPlans() {
  const { isAuthenticated } = useConvexAuth();
  const plans = useQuery(
    api.workoutPlans.getMyPlans,
    isAuthenticated ? {} : "skip",
  );

  return {
    workoutPlans: plans ?? [],
    isLoading: isAuthenticated && plans === undefined,
    error: null,
  };
}

export function useCurrentWorkoutPlan() {
  const { isAuthenticated } = useConvexAuth();
  const plan = useQuery(
    api.workoutPlans.getCurrentPlan,
    isAuthenticated ? {} : "skip",
  );

  return {
    workoutPlan: plan ?? null,
    isLoading: isAuthenticated && plan === undefined,
    error: null,
  };
}
