"use client";

import { useTranslations, useLocale } from "next-intl";
import { Weight, TrendingDown, TrendingUp, Calendar } from "lucide-react";
import { WidgetCard } from "@fitfast/ui/widget-card";
import type { CheckIn } from "@/types/convex";
import { formatDate } from "@/lib/utils";

interface StatsOverviewProps {
  firstCheckIn: CheckIn | undefined;
  latestCheckIn: CheckIn | undefined;
  weightChange: number;
  weightChangePercent: string;
  totalCheckIns: number;
}

export function StatsOverview({
  firstCheckIn,
  latestCheckIn,
  weightChange,
  weightChangePercent,
  totalCheckIns,
}: StatsOverviewProps) {
  const t = useTranslations("progress");
  const locale = useLocale();

  const trendDirection = weightChange < 0 ? "down" as const : weightChange > 0 ? "up" as const : "neutral" as const;

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <div className="animate-slide-up" style={{ animationDelay: "0ms" }}>
        <WidgetCard
          icon={Weight}
          title={t("startWeight")}
          value={firstCheckIn?.weight ? `${firstCheckIn.weight}` : "-"}
          subtitle={firstCheckIn ? formatDate(new Date(firstCheckIn._creationTime).toISOString(), locale) : "-"}
          featureColor="primary"
        />
      </div>

      <div className="animate-slide-up" style={{ animationDelay: "50ms" }}>
        <WidgetCard
          icon={Weight}
          title={t("currentWeight")}
          value={latestCheckIn?.weight ? `${latestCheckIn.weight}` : "-"}
          subtitle={latestCheckIn ? formatDate(new Date(latestCheckIn._creationTime).toISOString(), locale) : "-"}
          featureColor="nutrition"
        />
      </div>

      <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
        <WidgetCard
          icon={weightChange < 0 ? TrendingDown : TrendingUp}
          title={t("totalChange")}
          value={weightChange !== 0 ? `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)}` : "-"}
          trend={weightChange !== 0 ? { direction: trendDirection, label: `${weightChange > 0 ? "+" : ""}${weightChangePercent}%` } : undefined}
          featureColor="fitness"
        />
      </div>

      <div className="animate-slide-up" style={{ animationDelay: "150ms" }}>
        <WidgetCard
          icon={Calendar}
          title={t("checkIns")}
          value={totalCheckIns}
          subtitle={t("totalRecorded")}
          featureColor="routine"
        />
      </div>
    </div>
  );
}
