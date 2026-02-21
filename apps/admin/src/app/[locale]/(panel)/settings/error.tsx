"use client";

import { RouteError } from "@fitfast/ui/route-error";

export default function AdminSettingsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} feature="admin-settings-page" route="/admin/settings" translationKey="routeErrors.adminSettings" />;
}
