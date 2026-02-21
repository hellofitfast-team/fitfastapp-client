import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@fitfast/i18n/routing";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const intlMiddleware = createMiddleware(routing);

const publicRoutes = ["/login", "/magic-link", "/set-password"];

function stripLocale(pathname: string): string {
  const stripped = pathname.replace(/^\/(en|ar)/, "");
  return stripped || "/";
}

function isPublicRoute(pathname: string): boolean {
  const path = stripLocale(pathname);
  return publicRoutes.some((route) => path === route);
}

function getLocaleFromPath(pathname: string): string {
  const match = pathname.match(/^\/(en|ar)/);
  return match ? match[1] : "en";
}

const isPublicClerkRoute = createRouteMatcher([
  "/(en|ar)/login(.*)",
  "/(en|ar)/magic-link(.*)",
  "/(en|ar)/set-password(.*)",
]);

export default clerkMiddleware(
  async (auth, request: NextRequest) => {
    const { pathname, origin } = request.nextUrl;

    if (
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon") ||
      pathname.includes(".")
    ) {
      return NextResponse.next();
    }

    if (isPublicRoute(pathname)) {
      return intlMiddleware(request);
    }

    const { userId } = await auth();
    const locale = getLocaleFromPath(pathname);

    if (!userId) {
      return NextResponse.redirect(new URL(`/${locale}/login`, origin));
    }

    return intlMiddleware(request);
  },
);

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
