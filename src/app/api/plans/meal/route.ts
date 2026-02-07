import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMealPlan } from "@/lib/ai/meal-plan-generator";
import { getOneSignalClient } from "@/lib/onesignal";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { checkInId, planDuration = 14 } = body;

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Fetch initial assessment
    const { data: assessment, error: assessmentError } = await supabase
      .from("initial_assessments")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (assessmentError || !assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    // Fetch check-in if provided
    let checkIn: any = null;
    if (checkInId) {
      const { data: checkInData } = await supabase
        .from("check_ins")
        .select("*")
        .eq("id", checkInId)
        .single();
      checkIn = checkInData;
    }

    // Type assertions for generated types
    const typedProfile = profile as any;
    const typedAssessment = assessment as any;

    // Generate meal plan using AI
    const generatedPlan = await generateMealPlan({
      profile: typedProfile,
      assessment: typedAssessment,
      checkIn: checkIn || undefined,
      language: typedProfile.language,
      planDuration,
    });

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + planDuration);

    // Save to database
    const { data: savedPlan, error: saveError } = await supabase
      .from("meal_plans")
      .insert({
        user_id: user.id,
        check_in_id: checkInId || null,
        plan_data: generatedPlan as any,
        language: typedProfile.language,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
      } as any)
      .select()
      .single();

    if (saveError) {
      console.error("Error saving meal plan:", saveError);
      return NextResponse.json(
        { error: "Failed to save meal plan" },
        { status: 500 }
      );
    }

    // Send push notification (fire-and-forget)
    try {
      getOneSignalClient().sendToUser(
        user.id,
        "Meal Plan Ready!",
        "Your new meal plan is ready. Check it out!",
        { url: "/meal-plan" }
      );
    } catch {
      // Never block response on notification failure
    }

    return NextResponse.json({
      success: true,
      mealPlan: savedPlan,
    });
  } catch (error) {
    console.error("Meal plan generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate meal plan" },
      { status: 500 }
    );
  }
}
