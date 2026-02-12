import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Profile, InitialAssessment } from "@/types/database";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  let userId: string | undefined;

  try {
    const supabase = await createClient();

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    userId = user?.id;

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", authenticated: false },
        { status: 401 }
      );
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const typedProfile = profile as Profile | null;

    if (profileError || !typedProfile) {
      return NextResponse.json(
        { error: "Profile not found", authenticated: true, profile: null },
        { status: 404 }
      );
    }

    // Check if initial assessment is completed
    const { data: assessment, error: assessmentError } = await supabase
      .from("initial_assessments")
      .select("id, created_at")
      .eq("user_id", user.id)
      .single();

    type AssessmentData = Pick<InitialAssessment, "id" | "created_at">;
    const typedAssessment = assessment as AssessmentData | null;

    const hasCompletedAssessment = !assessmentError && !!typedAssessment;

    // Determine the appropriate redirect path based on status and assessment
    let redirectPath = "/";
    let canAccessDashboard = false;

    const profileStatus = typedProfile.status;

    switch (profileStatus) {
      case "pending_approval":
        redirectPath = "/pending";
        canAccessDashboard = false;
        break;

      case "active":
        if (!hasCompletedAssessment) {
          redirectPath = "/initial-assessment";
          canAccessDashboard = false;
        } else {
          redirectPath = "/";
          canAccessDashboard = true;
        }
        break;

      case "inactive":
      case "expired":
        redirectPath = "/login";
        canAccessDashboard = false;
        break;

      default:
        redirectPath = "/login";
        canAccessDashboard = false;
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
      },
      profile: {
        id: typedProfile.id,
        full_name: typedProfile.full_name,
        phone: typedProfile.phone,
        language: typedProfile.language,
        status: profileStatus,
        plan_tier: typedProfile.plan_tier,
        plan_start_date: typedProfile.plan_start_date,
        plan_end_date: typedProfile.plan_end_date,
      },
      assessment: {
        completed: hasCompletedAssessment,
        created_at: typedAssessment?.created_at || null,
      },
      redirectPath,
      canAccessDashboard,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "profile" },
      extra: { userId },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
