import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "@sentry/nextjs", "react-hook-form", "zod"],
  },

  transpilePackages: ["@fitfast/ui", "@fitfast/i18n"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://*.convex.cloud",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.sentry.io",
              "frame-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

const configWithIntl = withNextIntl(nextConfig);
const configWithAnalyzer = withBundleAnalyzer(configWithIntl);

// Skip Sentry bundler wrapping in dev — it adds source map overhead that slows Turbopack
const finalConfig =
  process.env.NODE_ENV === "development"
    ? configWithAnalyzer
    : withSentryConfig(configWithAnalyzer, {
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        silent: !process.env.CI,
        widenClientFileUpload: !!process.env.CI,
        tunnelRoute: "/monitoring",
        sourcemaps: {
          deleteSourcemapsAfterUpload: true,
        },
      });

export default finalConfig;
