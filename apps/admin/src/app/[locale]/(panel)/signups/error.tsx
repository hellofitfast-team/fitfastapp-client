"use client";

import { RouteError } from "@fitfast/ui/route-error";

export default function AdminSignupsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} feature="admin-signups-page" route="/admin/signups" translationKey="routeErrors.adminSignups" />;
}
