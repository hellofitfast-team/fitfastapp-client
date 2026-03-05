"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import dynamic from "next/dynamic";
import { Activity, Camera, Calendar } from "lucide-react";
import { StatsOverview } from "./_components/stats-overview";
import { PhotosTab } from "./_components/photos-tab";
import { HistoryTab } from "./_components/history-tab";
import { ProgressSkeleton } from "./_components/progress-skeleton";
import { formatDateShort, formatDate } from "@/lib/utils";
import { cn } from "@fitfast/ui/cn";

const ProgressCharts = dynamic(() => import("@/components/charts/ProgressCharts"), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="border-border bg-card shadow-card overflow-hidden rounded-xl border">
        <div className="border-border bg-primary/5 h-14 animate-pulse border-b p-4" />
        <div className="p-6">
          <div className="h-[300px] animate-pulse rounded-lg bg-neutral-100" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="border-border bg-card shadow-card h-[200px] animate-pulse rounded-xl border" />
        <div className="border-border bg-card shadow-card h-[200px] animate-pulse rounded-xl border" />
      </div>
    </div>
  ),
});

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
  const weightChange =
    latestCheckIn?.weight && firstCheckIn?.weight ? latestCheckIn.weight - firstCheckIn.weight : 0;
  const weightChangePercent = firstCheckIn?.weight
    ? ((weightChange / firstCheckIn.weight) * 100).toFixed(1)
    : "0";

  // Collect all photo storage IDs from check-ins (individual fields + legacy array)
  const photoStorageIds = useMemo(() => {
    const ids: Id<"_storage">[] = [];
    for (const ci of filteredCheckIns) {
      if (ci.progressPhotoFront) ids.push(ci.progressPhotoFront);
      if (ci.progressPhotoBack) ids.push(ci.progressPhotoBack);
      if (ci.progressPhotoSide) ids.push(ci.progressPhotoSide);
      if (ci.progressPhotoIds) ids.push(...ci.progressPhotoIds);
    }
    return ids;
  }, [filteredCheckIns]);

  // Resolve storage IDs to URLs in a single batch query
  const photoUrlMap = useQuery(
    api.storage.getFileUrlsBatch,
    photoStorageIds.length > 0 ? { storageIds: photoStorageIds } : "skip",
  );

  const allPhotos = useMemo(() => {
    if (!photoUrlMap) return [];
    return filteredCheckIns.flatMap((checkIn) => {
      const ids: Id<"_storage">[] = [];
      if (checkIn.progressPhotoFront) ids.push(checkIn.progressPhotoFront);
      if (checkIn.progressPhotoBack) ids.push(checkIn.progressPhotoBack);
      if (checkIn.progressPhotoSide) ids.push(checkIn.progressPhotoSide);
      if (checkIn.progressPhotoIds) ids.push(...checkIn.progressPhotoIds);
      const dateStr = formatDate(new Date(checkIn._creationTime).toISOString(), locale);
      return ids
        .filter((id) => photoUrlMap[id])
        .map((id) => ({ url: photoUrlMap[id]!, date: dateStr }));
    });
  }, [filteredCheckIns, photoUrlMap, locale]);

  if (checkInsLoading) {
    return <ProgressSkeleton />;
  }

  const tabs = [
    { key: "charts" as const, icon: Activity, label: t("charts") },
    { key: "photos" as const, icon: Camera, label: t("photos") },
    { key: "history" as const, icon: Calendar, label: t("history") },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{t("description")}</p>
        </div>
        <div className="flex rounded-lg bg-neutral-100 p-1">
          {(["30", "90", "all"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                dateRange === range
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
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
      <div className="flex rounded-xl bg-neutral-100 p-1">
        {tabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium transition-colors",
              activeTab === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
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
        />
      )}
      {activeTab === "photos" && <PhotosTab photos={allPhotos} />}
      {activeTab === "history" && <HistoryTab checkIns={filteredCheckIns} />}
    </div>
  );
}
