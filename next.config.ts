import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Enable PWA features
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "obxtcnygregnhbafsfsd.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Headers for PWA
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
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
      {
        source: "/(sw|OneSignalSDKWorker|OneSignalSDKUpdaterWorker).js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

// Wrap with next-intl first, then Sentry
const configWithIntl = withNextIntl(nextConfig);

export default withSentryConfig(configWithIntl, {
  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: "/monitoring",

  // Sourcemaps configuration
  sourcemaps: {
    // Hides source maps from generated client bundles
    deleteSourcemapsAfterUpload: true,
  },
});
