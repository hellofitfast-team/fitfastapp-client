"use client";

import { RouteError } from "@fitfast/ui/route-error";

export default function TicketsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} feature="tickets-page" route="/tickets" translationKey="routeErrors.tickets" />;
}
