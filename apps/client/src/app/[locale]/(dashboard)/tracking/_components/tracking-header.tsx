"use client";

import { useTranslations, useLocale } from "next-intl";
import { formatDateWithWeekday } from "@/lib/utils";

interface TrackingHeaderProps {
  completionPercentage: number;
  mealProgress: { completed: number; total: number };
  workoutDone: boolean;
}

export function TrackingHeader({
  completionPercentage,
  mealProgress,
  workoutDone,
}: TrackingHeaderProps) {
  const t = useTranslations("tracking");
  const locale = useLocale();

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground mt-0.5 text-sm">
        {formatDateWithWeekday(new Date(), locale)}
      </p>
      <div className="mt-3 flex gap-2">
        <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-semibold">
          {completionPercentage}% {t("complete")}
        </span>
        <span className="bg-nutrition/10 text-nutrition rounded-full px-3 py-1 text-xs font-semibold">
          {mealProgress.completed}/{mealProgress.total} {t("mealsCompleted")}
        </span>
        {workoutDone && (
          <span className="bg-fitness/10 text-fitness rounded-full px-3 py-1 text-xs font-semibold">
            {t("workoutCompleted")}
          </span>
        )}
      </div>
    </div>
  );
}
