"use client";

import { RouteError } from "@fitfast/ui/route-error";

export default function AdminTicketsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} feature="admin-tickets-page" route="/admin/tickets" translationKey="routeErrors.adminTickets" />;
}
