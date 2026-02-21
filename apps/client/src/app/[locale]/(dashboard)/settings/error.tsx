"use client";

import { RouteError } from "@fitfast/ui/route-error";

export default function SettingsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} feature="settings-page" route="/settings" translationKey="routeErrors.settings" />;
}
