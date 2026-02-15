"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("routeErrors.settings");

  useEffect(() => {
    // Log the error to Sentry with route-specific tags
    Sentry.captureException(error, {
      tags: {
        feature: "settings-page",
        route: "/settings",
      },
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="space-y-6 p-8">
          {/* Icon */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center border-4 border-black bg-error-500">
            <AlertTriangle className="h-10 w-10 text-white" strokeWidth={3} />
          </div>

          {/* Title */}
          <h1 className="text-center font-black text-2xl uppercase tracking-tight">
            {t("title")}
          </h1>

          {/* Description */}
          <p className="text-center text-neutral-700 font-bold">
            {t("description")}
          </p>

          {/* Error Digest */}
          {error.digest && (
            <p className="text-center text-xs text-neutral-500 font-mono">
              Error ID: {error.digest}
            </p>
          )}

          {/* Retry Button */}
          <button
            onClick={() => reset()}
            className="w-full border-4 border-black bg-primary py-3 font-black text-white uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    </div>
  );
}
