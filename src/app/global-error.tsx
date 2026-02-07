"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-neutral-900 mb-4">
              Something went wrong
            </h1>
            <p className="text-neutral-600 mb-6">
              We apologize for the inconvenience. Our team has been notified.
            </p>
            <Button onClick={() => reset()}>Try again</Button>
          </div>
        </div>
      </body>
    </html>
  );
}
