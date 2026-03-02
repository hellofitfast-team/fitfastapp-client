"use client";

import { RouteError } from "@fitfast/ui/route-error";

export default function KnowledgeError({
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
      feature="knowledge"
      route="/knowledge"
      translationKey="routeErrors.knowledge"
    />
  );
}
