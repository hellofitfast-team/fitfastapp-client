"use client";

import { RouteError } from "@fitfast/ui/route-error";

export default function NotificationsError({
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
      feature="notifications"
      route="/notifications"
      translationKey="routeErrors.notifications"
    />
  );
}
