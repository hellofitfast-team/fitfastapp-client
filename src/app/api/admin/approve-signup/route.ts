import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { PendingSignup } from "@/types/database";
import { getOneSignalClient } from "@/lib/onesignal";

export async function POST(request: Request) {
  const supabase = await createClient();

  // Verify caller is a coach
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select()
    .eq("id", user.id)
    .single<{ is_coach: boolean }>();

  if (!profile?.is_coach) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { signupId } = await request.json();

  // Fetch the signup
  const { data: signup, error: fetchError } = await supabase
    .from("pending_signups")
    .select()
    .eq("id", signupId)
    .single<PendingSignup>();

  if (fetchError || !signup) {
    return NextResponse.json({ error: "Signup not found" }, { status: 404 });
  }

  // Use admin client to create auth user (bypasses RLS + has admin rights)
  const adminSupabase = createAdminClient();

  const { data: authData, error: authError } =
    await adminSupabase.auth.admin.createUser({
      email: signup.email,
      email_confirm: true,
      user_metadata: { full_name: signup.full_name },
    });

  if (authError) {
    return NextResponse.json(
      { error: authError.message },
      { status: 400 }
    );
  }

  // Update the new user's profile with plan details
  const now = new Date();
  const tierMonths: Record<string, number> = {
    "3_months": 3,
    "6_months": 6,
    "12_months": 12,
  };
  const months = tierMonths[signup.plan_tier ?? ""] ?? 3;
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + months);

  await adminSupabase
    .from("profiles")
    .update({
      full_name: signup.full_name,
      phone: signup.phone,
      plan_tier: signup.plan_tier,
      status: "active" as const,
      plan_start_date: now.toISOString().split("T")[0],
      plan_end_date: endDate.toISOString().split("T")[0],
    } as never)
    .eq("id", authData.user.id);

  // Mark signup as approved
  await supabase
    .from("pending_signups")
    .update({
      status: "approved" as const,
      reviewed_at: new Date().toISOString(),
    } as never)
    .eq("id", signupId);

  // Send welcome notification (fire-and-forget)
  try {
    getOneSignalClient().sendToUser(
      authData.user.id,
      "Welcome to FitFast!",
      "Your account has been approved. Start your fitness journey now!"
    );
  } catch {
    // Never block response on notification failure
  }

  return NextResponse.json({ success: true, userId: authData.user.id });
}
