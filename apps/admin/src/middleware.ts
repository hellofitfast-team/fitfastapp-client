import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing } from "@fitfast/i18n/routing";
import {
  convexAuthNextjsMiddleware,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const intlMiddleware = createMiddleware(routing);

function stripLocale(pathname: string): string {
  const stripped = pathname.replace(/^\/(en|ar)/, "");
  return stripped || "/";
}

function getLocaleFromPath(pathname: string): string {
  const match = pathname.match(/^\/(en|ar)/);
  return match ? match[1] : "en";
}

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  const { pathname } = request.nextUrl;

  // Skip static files (but NOT /api/auth — handled by convexAuthNextjsMiddleware)
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) {
    const response = NextResponse.next();
    response.headers.set("x-request-id", requestId);
    return response;
  }

  const path = stripLocale(pathname);
  const locale = getLocaleFromPath(pathname);

  // Login page is public
  if (path === "/login") {
    const response = intlMiddleware(request);
    response.headers.set("x-request-id", requestId);
    return response;
  }

  // All other routes require authentication
  const isAuthenticated = await convexAuth.isAuthenticated();

  if (!isAuthenticated) {
    const response = nextjsMiddlewareRedirect(request, `/${locale}/login`);
    response.headers.set("x-request-id", requestId);
    return response;
  }

  // Coach role check is done at the layout level via Convex query
  // (checking profile.isCoach) — middleware only checks authentication
  const response = intlMiddleware(request);
  response.headers.set("x-request-id", requestId);
  return response;
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
