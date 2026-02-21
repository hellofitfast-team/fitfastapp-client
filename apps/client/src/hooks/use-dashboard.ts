"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useDashboardData() {
  const { isAuthenticated } = useConvexAuth();
  const data = useQuery(
    api.dashboard.getDashboardData,
    isAuthenticated ? {} : "skip",
  );

  return {
    dashboardData: data ?? null,
    isLoading: isAuthenticated && data === undefined,
    error: null,
  };
}
