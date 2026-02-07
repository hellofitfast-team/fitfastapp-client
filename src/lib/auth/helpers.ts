import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export type ProfileStatus = Profile["status"];

export interface UserProfile {
  user: {
    id: string;
    email: string | undefined;
  };
  profile: Profile | null;
  hasCompletedAssessment: boolean;
}

/**
 * Get the current authenticated user and their profile
 * Used in Server Components and Route Handlers
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return null;
    }

    // Check if initial assessment is completed
    const { data: assessment } = await supabase
      .from("initial_assessments")
      .select("id")
      .eq("user_id", user.id)
      .single();

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
      hasCompletedAssessment: !!assessment,
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

/**
 * Check if user can access dashboard
 * Returns true only if user is active and has completed assessment
 */
export async function canAccessDashboard(): Promise<boolean> {
  const userProfile = await getCurrentUserProfile();

  if (!userProfile) {
    return false;
  }

  return (
    userProfile.profile?.status === "active" &&
    userProfile.hasCompletedAssessment
  );
}

/**
 * Check if user is in pending approval status
 */
export async function isPendingApproval(): Promise<boolean> {
  const userProfile = await getCurrentUserProfile();

  if (!userProfile) {
    return false;
  }

  return userProfile.profile?.status === "pending_approval";
}

/**
 * Check if user account is inactive or expired
 */
export async function isInactiveOrExpired(): Promise<boolean> {
  const userProfile = await getCurrentUserProfile();

  if (!userProfile) {
    return false;
  }

  return (
    userProfile.profile?.status === "inactive" ||
    userProfile.profile?.status === "expired"
  );
}

/**
 * Get the appropriate redirect path based on user's profile status
 */
export async function getRedirectPath(locale: string = "en"): Promise<string> {
  const userProfile = await getCurrentUserProfile();

  if (!userProfile) {
    return `/${locale}/login`;
  }

  const { profile, hasCompletedAssessment } = userProfile;

  switch (profile?.status) {
    case "pending_approval":
      return `/${locale}/pending`;

    case "active":
      if (!hasCompletedAssessment) {
        return `/${locale}/initial-assessment`;
      }
      return `/${locale}`;

    case "inactive":
    case "expired":
      return `/${locale}/login?message=${profile.status === "expired" ? "subscription_expired" : "account_inactive"}`;

    default:
      return `/${locale}/login`;
  }
}

/**
 * Check if user's subscription is about to expire (within 7 days)
 */
export async function isSubscriptionExpiringSoon(): Promise<boolean> {
  const userProfile = await getCurrentUserProfile();

  if (!userProfile?.profile?.plan_end_date) {
    return false;
  }

  const endDate = new Date(userProfile.profile.plan_end_date);
  const today = new Date();
  const daysUntilExpiry = Math.ceil(
    (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
}

/**
 * Get days remaining in subscription
 */
export async function getDaysRemaining(): Promise<number | null> {
  const userProfile = await getCurrentUserProfile();

  if (!userProfile?.profile?.plan_end_date) {
    return null;
  }

  const endDate = new Date(userProfile.profile.plan_end_date);
  const today = new Date();
  const daysRemaining = Math.ceil(
    (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysRemaining;
}
