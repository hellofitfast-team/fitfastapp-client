import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

// Public routes that don't require authentication (without locale prefix)
const publicRoutes = [
  "/login",
  "/magic-link",
  "/set-password",
  "/auth/callback",
  "/auth/auth-code-error",
  "/admin/login",
];

function isPublicRoute(pathname: string): boolean {
  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, "");
  return publicRoutes.some((route) => pathWithoutLocale === route);
}

function isAdminRoute(pathname: string): boolean {
  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, "");
  return pathWithoutLocale.startsWith("/admin");
}

function isClientRoute(pathname: string): boolean {
  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, "");
  // Client routes include onboarding, dashboard, and all non-admin authenticated routes
  return (
    pathWithoutLocale.startsWith("/onboarding") ||
    pathWithoutLocale.startsWith("/dashboard") ||
    pathWithoutLocale.startsWith("/tracking") ||
    pathWithoutLocale.startsWith("/meals") ||
    pathWithoutLocale.startsWith("/workouts") ||
    pathWithoutLocale.startsWith("/check-in") ||
    pathWithoutLocale.startsWith("/progress") ||
    pathWithoutLocale.startsWith("/tickets") ||
    pathWithoutLocale.startsWith("/faq") ||
    pathWithoutLocale.startsWith("/settings") ||
    pathWithoutLocale === "/"
  );
}

function getLocaleFromPath(pathname: string): string {
  const match = pathname.match(/^\/(en|ar)/);
  return match ? match[1] : "en";
}

export async function proxy(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // Skip proxy for API routes, static files, and Next.js internals
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Public routes: skip auth entirely, just apply i18n
  if (isPublicRoute(pathname)) {
    const response = intlMiddleware(request);

    // intlMiddleware may redirect admin routes to wrong paths (e.g.
    // /en/admin/login → /en/login). Detect and prevent path-changing redirects.
    const location = response.headers.get("location");
    if (location && isAdminRoute(pathname)) {
      const redirectPath = new URL(location, origin).pathname;
      const redirectBase = redirectPath.replace(/^\/(en|ar)/, "");
      const originalBase = pathname.replace(/^\/(en|ar)/, "");
      if (redirectBase !== originalBase) {
        // intlMiddleware is stripping the path — rewrite instead
        return NextResponse.rewrite(new URL(pathname, origin));
      }
    }

    return response;
  }

  // Protected routes: refresh Supabase session (verifies JWT, refreshes if needed)
  const { user, supabase } = await updateSession(request);

  const locale = getLocaleFromPath(pathname);

  // No user on a protected route → redirect to appropriate login
  if (!user) {
    if (isAdminRoute(pathname)) {
      return NextResponse.redirect(new URL(`/${locale}/admin/login`, origin));
    }
    return NextResponse.redirect(new URL(`/${locale}/login`, origin));
  }

  // Check user's coach status for both admin and client routes
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_coach")
    .eq("id", user.id)
    .single<{ is_coach: boolean }>();

  const isCoach = profile?.is_coach ?? false;

  // Admin route protection: only coaches can access
  if (isAdminRoute(pathname)) {
    if (!isCoach) {
      // Not a coach → redirect to client dashboard
      return NextResponse.redirect(new URL(`/${locale}/`, origin));
    }
  }

  // Client route protection: coaches CANNOT access
  if (isClientRoute(pathname) && isCoach) {
    // Coach trying to access client routes → redirect to admin login with error
    return NextResponse.redirect(
      new URL(`/${locale}/admin/login?error=coach_account`, origin)
    );
  }

  // Authenticated → let layouts handle profile/assessment guards
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
