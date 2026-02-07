import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Profile } from "@/types/database";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get the user to check their profile status
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check if this is a magic link sign-in (user has no password)
        const { data: { user: authUser } } = await supabase.auth.getUser();

        // Fetch user profile to determine where to redirect
        const { data: profile } = await supabase
          .from("profiles")
          .select("status,language,is_coach")
          .eq("id", user.id)
          .single();

        type ProfileStatusLanguageCoach = Pick<Profile, "status" | "language" | "is_coach">;
        const typedProfile = profile as ProfileStatusLanguageCoach | null;

        const locale = typedProfile?.language || "en";

        // If user is a coach, sign them out and redirect to admin login with error
        if (typedProfile?.is_coach) {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/${locale}/admin/login?error=coach_account`);
        }

        // If user came from magic link and needs to set password, redirect to set-password
        // This is determined by checking if they have an encrypted password or recovery token
        if (authUser && searchParams.get("type") === "magiclink") {
          return NextResponse.redirect(`${origin}/${locale}/set-password`);
        }

        if (typedProfile) {
          // Redirect based on profile status
          switch (typedProfile.status) {
            case "pending_approval":
              return NextResponse.redirect(`${origin}/${locale}/pending`);

            case "active":
              // Check if initial assessment is completed
              const { data: assessment } = await supabase
                .from("initial_assessments")
                .select("id")
                .eq("user_id", user.id)
                .single();

              if (!assessment) {
                // No assessment completed - redirect to initial assessment
                return NextResponse.redirect(
                  `${origin}/${locale}/initial-assessment`
                );
              }

              // Assessment completed - redirect to dashboard or next param
              const targetPath = next.startsWith("/") ? next : `/${locale}`;
              return NextResponse.redirect(`${origin}${targetPath}`);

            case "inactive":
            case "expired":
              // Redirect to login with error message
              const loginUrl = new URL(`/${locale}/login`, origin);
              loginUrl.searchParams.set(
                "message",
                typedProfile.status === "expired"
                  ? "subscription_expired"
                  : "account_inactive"
              );
              return NextResponse.redirect(loginUrl);

            default:
              return NextResponse.redirect(`${origin}/${locale}/login`);
          }
        }
      }

      // If no profile found, redirect to default locale
      return NextResponse.redirect(`${origin}/en`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/en/auth/auth-code-error`);
}
