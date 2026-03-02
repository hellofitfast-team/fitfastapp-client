"use client";

import { RouteError } from "@fitfast/ui/route-error";

export default function MealPlanError({
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
      feature="meal-plan"
      route="/meal-plan"
      translationKey="routeErrors.mealPlan"
    />
  );
}
