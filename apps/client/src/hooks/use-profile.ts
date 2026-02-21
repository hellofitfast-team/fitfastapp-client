"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useProfile() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const profile = useQuery(
    api.profiles.getMyProfile,
    isAuthenticated ? {} : "skip",
  );

  return {
    profile: profile ?? null,
    isLoading: authLoading || (isAuthenticated && profile === undefined),
    isError: false,
    error: null,
  };
}

export function useIsAuthenticated() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  return { isAuthenticated, isLoading };
}

export function useCanAccessDashboard() {
  const { profile, isLoading } = useProfile();
  return {
    canAccess: profile?.status === "active",
    isLoading,
  };
}

export function useProfileStatus() {
  const { profile, isLoading } = useProfile();
  return {
    status: profile?.status,
    isLoading,
  };
}
