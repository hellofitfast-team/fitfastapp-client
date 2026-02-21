"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import dynamic from "next/dynamic";
import { Activity, Camera, Calendar } from "lucide-react";
import { StatsOverview } from "./_components/stats-overview";
import { PhotosTab } from "./_components/photos-tab";
import { HistoryTab } from "./_components/history-tab";
import { ProgressSkeleton } from "./_components/progress-skeleton";
import { formatDateShort, formatDate } from "@/lib/utils";
import { cn } from "@fitfast/ui/cn";

const ProgressCharts = dynamic(
  () => import("@/components/charts/ProgressCharts"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="p-4 border-b border-border bg-primary/5 h-14 animate-pulse" />
          <div className="p-6">
            <div className="h-[300px] rounded-lg bg-neutral-100 animate-pulse" />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card shadow-card h-[200px] animate-pulse" />
          <div className="rounded-xl border border-border bg-card shadow-card h-[200px] animate-pulse" />
        </div>
      </div>
    ),
  }
);

type DateRange = "30" | "90" | "all";

interface MeasurementData {
  chest?: number;
  waist?: number;
  hips?: number;
  arms?: number;
  thighs?: number;
}

export default function ProgressPage() {
  const t = useTranslations("progress");
  const locale = useLocale();
  const [dateRange, setDateRange] = useState<DateRange>("30");
  const [activeTab, setActiveTab] = useState<"charts" | "photos" | "history">("charts");

  const checkIns = useQuery(api.checkIns.getMyCheckIns);
  const checkInsLoading = checkIns === undefined;

  // Sort ascending for charts (Convex returns desc)
  const sortedCheckIns = useMemo(() => {
    if (!checkIns) return [];
    return [...checkIns].reverse();
  }, [checkIns]);

  const filteredCheckIns = useMemo(() => {
    if (dateRange === "all") return sortedCheckIns;
    const days = dateRange === "30" ? 30 : 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return sortedCheckIns.filter((checkIn) => new Date(checkIn._creationTime) >= cutoffDate);
  }, [sortedCheckIns, dateRange]);

  const weightChartData = useMemo(() => {
    return filteredCheckIns
      .filter((checkIn) => checkIn.weight)
      .map((checkIn) => ({
        date: formatDateShort(new Date(checkIn._creationTime).toISOString(), locale),
        weight: checkIn.weight ?? null,
      }));
  }, [filteredCheckIns, locale]);

  const measurementChartData = useMemo(() => {
    return filteredCheckIns
      .filter((checkIn) => checkIn.measurements)
      .map((checkIn) => {
        const measurements = checkIn.measurements as MeasurementData;
        return {
          date: formatDateShort(new Date(checkIn._creationTime).toISOString(), locale),
          chest: measurements.chest,
          waist: measurements.waist,
          hips: measurements.hips,
          arms: measurements.arms,
          thighs: measurements.thighs,
        };
      });
  }, [filteredCheckIns, locale]);

  const firstCheckIn = filteredCheckIns[0];
  const latestCheckIn = filteredCheckIns[filteredCheckIns.length - 1];
  const weightChange = latestCheckIn?.weight && firstCheckIn?.weight
    ? latestCheckIn.weight - firstCheckIn.weight
    : 0;
  const weightChangePercent = firstCheckIn?.weight
    ? ((weightChange / firstCheckIn.weight) * 100).toFixed(1)
    : "0";

  // Adherence stats are not easily calculable from check-ins alone in Convex
  // For now, use placeholder values
  const adherenceStats = { mealAdherence: 0, workoutAdherence: 0 };

  const allPhotos = useMemo(() => {
    return filteredCheckIns
      .filter((checkIn) => checkIn.progressPhotoIds && checkIn.progressPhotoIds.length > 0)
      .flatMap((checkIn) =>
        (checkIn.progressPhotoIds || []).map((storageId) => ({
          url: storageId, // Will need to resolve via getFileUrl
          date: formatDate(new Date(checkIn._creationTime).toISOString(), locale),
        }))
      );
  }, [filteredCheckIns, locale]);

  if (checkInsLoading) {
    return <ProgressSkeleton />;
  }

  const tabs = [
    { key: "charts" as const, icon: Activity, label: t("charts") },
    { key: "photos" as const, icon: Camera, label: t("photos") },
    { key: "history" as const, icon: Calendar, label: t("history") },
  ];

  return (
    <div className="px-4 py-6 space-y-5 max-w-4xl mx-auto lg:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("description")}</p>
        </div>
        <div className="flex rounded-lg bg-neutral-100 p-1">
          {(["30", "90", "all"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                dateRange === range
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {range === "30" ? t("days30") : range === "90" ? t("days90") : t("all")}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <StatsOverview
        firstCheckIn={firstCheckIn}
        latestCheckIn={latestCheckIn}
        weightChange={weightChange}
        weightChangePercent={weightChangePercent}
        totalCheckIns={filteredCheckIns.length}
      />

      {/* Tabs */}
      <div className="flex rounded-lg bg-neutral-100 p-1">
        {tabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "charts" && (
        <ProgressCharts
          weightChartData={weightChartData}
          measurementChartData={measurementChartData}
          adherenceStats={adherenceStats}
        />
      )}
      {activeTab === "photos" && <PhotosTab photos={allPhotos} />}
      {activeTab === "history" && <HistoryTab checkIns={filteredCheckIns} />}
    </div>
  );
}
