import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

export interface UserWithProfile {
  user: User;
  profile: Profile | null;
}

/**
 * Get current session (cached for request lifecycle)
 */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
});

/**
 * Get current user with profile data
 */
export const getCurrentUser = cache(
  async (): Promise<UserWithProfile | null> => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return {
      user,
      profile: profile || null,
    };
  }
);

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<UserWithProfile> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  return currentUser;
}

/**
 * Check profile status and determine routing
 */
export async function checkProfileStatus(locale: string = "en"): Promise<{
  isAuthenticated: boolean;
  redirectPath: string | null;
}> {
  const currentUser = await getCurrentUser();

  // Not authenticated
  if (!currentUser) {
    return {
      isAuthenticated: false,
      redirectPath: `/${locale}/login`,
    };
  }

  const { profile } = currentUser;

  // No profile created yet -> redirect to welcome
  if (!profile) {
    return {
      isAuthenticated: true,
      redirectPath: `/${locale}/welcome`,
    };
  }

  // Profile pending approval -> redirect to pending page
  if (profile.status === "pending_approval") {
    return {
      isAuthenticated: true,
      redirectPath: `/${locale}/pending`,
    };
  }

  // Profile inactive or expired -> show error or redirect to contact
  if (profile.status === "inactive" || profile.status === "expired") {
    return {
      isAuthenticated: true,
      redirectPath: `/${locale}/pending`, // Could be a different page for expired
    };
  }

  // Check if initial assessment is completed
  const supabase = await createClient();
  const { data: assessment } = await supabase
    .from("initial_assessments")
    .select("id")
    .eq("user_id", currentUser.user.id)
    .single();

  if (!assessment) {
    return {
      isAuthenticated: true,
      redirectPath: `/${locale}/initial-assessment`,
    };
  }

  // All good - user can access dashboard
  return {
    isAuthenticated: true,
    redirectPath: null,
  };
}
