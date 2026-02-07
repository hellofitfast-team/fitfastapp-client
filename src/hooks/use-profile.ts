"use client";

import useSWR from "swr";

export interface ProfileData {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
  };
  profile?: {
    id: string;
    full_name: string | null;
    phone: string | null;
    language: "en" | "ar";
    status: "pending_approval" | "active" | "inactive" | "expired";
    plan_tier: "3_months" | "6_months" | "12_months" | null;
    plan_start_date: string | null;
    plan_end_date: string | null;
  };
  assessment?: {
    completed: boolean;
    created_at: string | null;
  };
  redirectPath?: string;
  canAccessDashboard?: boolean;
  error?: string;
}

const fetcher = async (url: string): Promise<ProfileData> => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch profile");
  }

  return res.json();
};

/**
 * Hook to fetch and cache the current user's profile
 * Uses SWR for client-side caching and revalidation
 */
export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR<ProfileData>(
    "/api/auth/profile",
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      shouldRetryOnError: false,
    }
  );

  return {
    profile: data,
    isLoading,
    isError: !!error,
    error,
    mutate, // Allows manual revalidation
  };
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated() {
  const { profile, isLoading } = useProfile();
  return {
    isAuthenticated: profile?.authenticated ?? false,
    isLoading,
  };
}

/**
 * Hook to check if user can access dashboard
 */
export function useCanAccessDashboard() {
  const { profile, isLoading } = useProfile();
  return {
    canAccess: profile?.canAccessDashboard ?? false,
    isLoading,
  };
}

/**
 * Hook to get user's status
 */
export function useProfileStatus() {
  const { profile, isLoading } = useProfile();
  return {
    status: profile?.profile?.status,
    isLoading,
  };
}
