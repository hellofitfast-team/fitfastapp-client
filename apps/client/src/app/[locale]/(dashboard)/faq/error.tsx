"use client";

import { RouteError } from "@fitfast/ui/route-error";

export default function FaqError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      feature="faq"
      route="/faq"
      translationKey="routeErrors.faq"
    />
  );
}
