"use client";

import { useTranslations, useLocale } from "next-intl";
import { formatDateWithWeekday } from "@/lib/utils";

interface TrackingHeaderProps {
  completionPercentage: number;
  mealProgress: { completed: number; total: number };
  workoutDone: boolean;
}

export function TrackingHeader({ completionPercentage, mealProgress, workoutDone }: TrackingHeaderProps) {
  const t = useTranslations("tracking");
  const locale = useLocale();

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-sm text-muted-foreground mt-0.5">
        {formatDateWithWeekday(new Date(), locale)}
      </p>
      <div className="flex gap-2 mt-3">
        <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
          {completionPercentage}% {t("complete")}
        </span>
        <span className="rounded-full bg-[#10B981]/10 text-[#10B981] px-3 py-1 text-xs font-semibold">
          {mealProgress.completed}/{mealProgress.total} {t("mealsCompleted")}
        </span>
        {workoutDone && (
          <span className="rounded-full bg-[#F97316]/10 text-[#F97316] px-3 py-1 text-xs font-semibold">
            {t("workoutCompleted")}
          </span>
        )}
      </div>
    </div>
  );
}
