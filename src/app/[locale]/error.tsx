"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-100">
            <AlertTriangle className="h-8 w-8 text-error-600" />
          </div>
          <CardTitle className="text-xl text-neutral-900">
            {t("error")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-neutral-600">
            Something went wrong. Our team has been notified and we&apos;re working to fix it.
          </p>
          {error.digest && (
            <p className="text-xs text-neutral-400">
              Error ID: {error.digest}
            </p>
          )}
          <Button onClick={() => reset()} className="w-full">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
