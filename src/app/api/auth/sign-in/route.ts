import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { validateRequestBody, SignInSchema } from "@/lib/api-validation";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateRequestBody(body, SignInSchema, {
      feature: "sign-in",
    });
    if (!validation.success) return validation.response;
    const { email, locale } = validation.data;

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
      Sentry.captureException(error, {
        level: "warning",
        tags: { feature: "sign-in" },
        extra: { email },
      });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Check your email for the magic link"
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "sign-in" },
      extra: { email: "unknown" },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
