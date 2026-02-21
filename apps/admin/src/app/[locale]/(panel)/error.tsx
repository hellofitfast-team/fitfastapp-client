"use client";

import { RouteError } from "@fitfast/ui/route-error";

export default function AdminPanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} feature="admin-panel" route="/admin" translationKey="routeErrors.adminPanel" />;
}
