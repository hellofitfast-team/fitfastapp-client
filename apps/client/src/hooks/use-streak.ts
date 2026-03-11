"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/** Returns the user's current streak, passing local date for timezone accuracy */
export function useStreak() {
  const { isAuthenticated } = useConvexAuth();
  // Send the client's local YYYY-MM-DD so the server computes streaks
  // relative to the user's midnight, not UTC midnight.
  const clientToday = new Date().toLocaleDateString("en-CA"); // en-CA → YYYY-MM-DD
  const data = useQuery(api.completions.getStreak, isAuthenticated ? { clientToday } : "skip");

  return {
    streak: data?.currentStreak ?? 0,
    isLoading: isAuthenticated && data === undefined,
  };
}
