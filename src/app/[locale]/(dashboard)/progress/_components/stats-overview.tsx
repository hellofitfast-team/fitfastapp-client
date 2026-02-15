"use client";

import { useTranslations } from "next-intl";
import { Weight, TrendingDown, TrendingUp, Calendar } from "lucide-react";
import type { CheckIn } from "@/types/database";

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

  return (
    <div className="grid gap-0 md:grid-cols-4">
      <div className="border-4 border-black -ms-0 md:-ms-0 -mt-1 md:-mt-0 first:mt-0 first:ms-0 bg-cream p-5">
        <div className="flex items-center gap-2 mb-2">
          <Weight className="h-4 w-4 text-neutral-500" />
          <span className="font-bold text-sm text-neutral-500">{t("startWeight").toUpperCase()}</span>
        </div>
        <p className="text-3xl font-black">{firstCheckIn?.weight ? `${firstCheckIn.weight}` : "-"}</p>
        <p className="font-bold text-sm text-neutral-500 mt-1">
          {firstCheckIn ? new Date(firstCheckIn.created_at).toLocaleDateString() : "-"}
        </p>
      </div>

      <div className="border-4 border-black -ms-0 md:-ms-1 -mt-1 md:-mt-0 bg-cream p-5">
        <div className="flex items-center gap-2 mb-2">
          <Weight className="h-4 w-4 text-neutral-500" />
          <span className="font-bold text-sm text-neutral-500">{t("currentWeight").toUpperCase()}</span>
        </div>
        <p className="text-3xl font-black">{latestCheckIn?.weight ? `${latestCheckIn.weight}` : "-"}</p>
        <p className="font-bold text-sm text-neutral-500 mt-1">
          {latestCheckIn ? new Date(latestCheckIn.created_at).toLocaleDateString() : "-"}
        </p>
      </div>

      <div className="border-4 border-black -ms-0 md:-ms-1 -mt-1 md:-mt-0 bg-cream p-5">
        <div className="flex items-center gap-2 mb-2">
          {weightChange < 0 ? (
            <TrendingDown className="h-4 w-4 text-success-500" />
          ) : (
            <TrendingUp className="h-4 w-4 text-error-500" />
          )}
          <span className="font-bold text-sm text-neutral-500">{t("totalChange").toUpperCase()}</span>
        </div>
        <p className={`text-3xl font-black ${weightChange < 0 ? "text-success-500" : "text-error-500"}`}>
          {weightChange !== 0 ? `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)}` : "-"}
        </p>
        <p className="font-bold text-sm text-neutral-500 mt-1">
          {weightChange !== 0 ? `${weightChange > 0 ? "+" : ""}${weightChangePercent}%` : "-"}
        </p>
      </div>

      <div className="border-4 border-black -ms-0 md:-ms-1 -mt-1 md:-mt-0 bg-primary p-5">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-white/80" />
          <span className="font-bold text-sm text-white/80">{t("checkIns").toUpperCase()}</span>
        </div>
        <p className="text-3xl font-black text-white">{totalCheckIns}</p>
        <p className="font-bold text-sm text-white/80 mt-1">{t("totalRecorded").toUpperCase()}</p>
      </div>
    </div>
  );
}
