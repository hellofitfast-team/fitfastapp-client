"use client";

import { RouteError } from "@fitfast/ui/route-error";

export default function CheckInError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} feature="check-in-page" route="/check-in" translationKey="routeErrors.checkIn" />;
}
