"use client";

import { useTranslations, useLocale } from "next-intl";
import { Weight, TrendingDown, TrendingUp, Calendar } from "lucide-react";
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

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-border bg-card shadow-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100">
            <Weight className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{t("startWeight")}</span>
        </div>
        <p className="text-2xl font-bold">{firstCheckIn?.weight ? `${firstCheckIn.weight}` : "-"}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {firstCheckIn ? formatDate(new Date(firstCheckIn._creationTime).toISOString(), locale) : "-"}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100">
            <Weight className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{t("currentWeight")}</span>
        </div>
        <p className="text-2xl font-bold">{latestCheckIn?.weight ? `${latestCheckIn.weight}` : "-"}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {latestCheckIn ? formatDate(new Date(latestCheckIn._creationTime).toISOString(), locale) : "-"}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100">
            {weightChange < 0 ? (
              <TrendingDown className="h-4 w-4 text-success-500" />
            ) : (
              <TrendingUp className="h-4 w-4 text-error-500" />
            )}
          </div>
          <span className="text-xs font-medium text-muted-foreground">{t("totalChange")}</span>
        </div>
        <p className={`text-2xl font-bold ${weightChange < 0 ? "text-success-500" : weightChange > 0 ? "text-error-500" : ""}`}>
          {weightChange !== 0 ? `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)}` : "-"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {weightChange !== 0 ? `${weightChange > 0 ? "+" : ""}${weightChangePercent}%` : "-"}
        </p>
      </div>

      <div className="rounded-xl bg-primary shadow-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
            <Calendar className="h-4 w-4 text-white" />
          </div>
          <span className="text-xs font-medium text-white/70">{t("checkIns")}</span>
        </div>
        <p className="text-2xl font-bold text-white">{totalCheckIns}</p>
        <p className="text-xs text-white/70 mt-1">{t("totalRecorded")}</p>
      </div>
    </div>
  );
}
