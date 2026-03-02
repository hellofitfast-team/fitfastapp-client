"use client";

import { RouteError } from "@fitfast/ui/route-error";

export default function FaqsError({
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
      feature="faqs"
      route="/faqs"
      translationKey="routeErrors.faqs"
    />
  );
}
