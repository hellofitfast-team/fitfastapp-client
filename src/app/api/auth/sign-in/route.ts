import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, locale = "en" } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { origin } = new URL(request.url);

    // Send magic link
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/api/auth/callback?next=/${locale}`,
      },
    });

    if (error) {
      console.error("Sign-in error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Check your email for the magic link"
    });
  } catch (error) {
    console.error("Sign-in API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
