"use client";

import { RouteError } from "@fitfast/ui/route-error";

export default function TrackingError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} feature="tracking-page" route="/tracking" translationKey="routeErrors.tracking" />;
}
