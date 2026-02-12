import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMealPlan } from "@/lib/ai/meal-plan-generator";
import { getOneSignalClient } from "@/lib/onesignal";
import {
  getProfileById,
  getAssessmentByUserId,
  getCheckInById,
  saveMealPlan,
} from "@/lib/supabase/queries";
import * as Sentry from "@sentry/nextjs";
import { validateRequestBody, GeneratePlanSchema } from "@/lib/api-validation";

export async function POST(request: NextRequest) {
  let userId: string | undefined;

  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userId = user?.id;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const validation = validateRequestBody(body, GeneratePlanSchema, {
      userId: user.id,
      feature: "meal-plan-generation",
    });
    if (!validation.success) return validation.response;
    const { checkInId, planDuration } = validation.data;

    // Fetch user profile using extracted query
    const profile = await getProfileById(supabase, user.id);

    // Fetch initial assessment using extracted query
    const assessment = await getAssessmentByUserId(supabase, user.id);

    // Fetch check-in if provided using extracted query
    const checkIn = checkInId
      ? await getCheckInById(supabase, checkInId)
      : null;

    // Generate meal plan using AI
    const generatedPlan = await generateMealPlan({
      profile: profile as any,
      assessment: assessment as any,
      checkIn: checkIn || undefined,
      language: profile.language,
      planDuration,
    });

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + planDuration);

    // Save to database using extracted query
    const savedPlan = await saveMealPlan(supabase, {
      userId: user.id,
      checkInId: checkInId || null,
      planData: generatedPlan,
      language: profile.language,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    });

    // Send push notification (fire-and-forget)
    try {
      getOneSignalClient().sendToUser(
        user.id,
        "Meal Plan Ready!",
        "Your new meal plan is ready. Check it out!",
        { url: "/meal-plan" }
      );
    } catch (notifError) {
      Sentry.captureException(notifError, {
        level: "warning",
        tags: { feature: "notification" },
        extra: { userId: user.id, action: "meal-plan-notification" },
      });
    }

    return NextResponse.json({
      success: true,
      mealPlan: savedPlan,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "meal-plan-generation" },
      extra: {
        userId,
        action: "generate-meal-plan",
        timestamp: new Date().toISOString(),
      },
    });
    return NextResponse.json(
      { error: "Failed to generate meal plan" },
      { status: 500 }
    );
  }
}
