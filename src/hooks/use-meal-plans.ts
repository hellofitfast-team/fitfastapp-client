"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { MealPlan } from "@/types/database";

interface UseMealPlansOptions {
  userId?: string;
  limit?: number;
}

const fetcher = async (
  key: string,
  userId?: string,
  limit?: number
): Promise<MealPlan[]> => {
  const supabase = createClient();

  let query = supabase
    .from("meal_plans")
    .select("*")
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
};

export function useMealPlans(options: UseMealPlansOptions = {}) {
  const { userId, limit } = options;

  const { data, error, isLoading, mutate } = useSWR(
    userId ? ["meal_plans", userId, limit] : null,
    ([, uid, lim]) => fetcher("meal_plans", uid, lim)
  );

  return {
    mealPlans: data || [],
    isLoading,
    error,
    refetch: mutate,
  };
}

export function useCurrentMealPlan(userId?: string) {
  const supabase = createClient();

  const fetcher = async (): Promise<MealPlan | null> => {
    if (!userId) return null;

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("user_id", userId)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "no rows returned"
      throw error;
    }

    return data;
  };

  const { data, error, isLoading, mutate } = useSWR(
    userId ? `current_meal_plan_${userId}` : null,
    fetcher
  );

  return {
    mealPlan: data || null,
    isLoading,
    error,
    refetch: mutate,
  };
}
