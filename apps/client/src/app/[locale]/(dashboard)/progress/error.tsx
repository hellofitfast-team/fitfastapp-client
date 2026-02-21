"use client";

import { RouteError } from "@fitfast/ui/route-error";

export default function ProgressError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} feature="progress-page" route="/progress" translationKey="routeErrors.progress" />;
}
