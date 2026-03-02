"use client";

import { RouteError } from "@fitfast/ui/route-error";

export default function WorkoutPlanError({
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
      feature="workout-plan"
      route="/workout-plan"
      translationKey="routeErrors.workoutPlan"
    />
  );
}
