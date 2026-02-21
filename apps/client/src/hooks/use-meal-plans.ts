"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useMealPlans() {
  const { isAuthenticated } = useConvexAuth();
  const plans = useQuery(
    api.mealPlans.getMyPlans,
    isAuthenticated ? {} : "skip",
  );

  return {
    mealPlans: plans ?? [],
    isLoading: isAuthenticated && plans === undefined,
    error: null,
  };
}

export function useCurrentMealPlan() {
  const { isAuthenticated } = useConvexAuth();
  const plan = useQuery(
    api.mealPlans.getCurrentPlan,
    isAuthenticated ? {} : "skip",
  );

  return {
    mealPlan: plan ?? null,
    isLoading: isAuthenticated && plan === undefined,
    error: null,
  };
}
