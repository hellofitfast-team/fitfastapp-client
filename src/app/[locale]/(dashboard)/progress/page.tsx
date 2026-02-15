"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { Activity, Camera, Calendar } from "lucide-react";
import type { CheckIn, MealCompletion, WorkoutCompletion } from "@/types/database";
import { StatsOverview } from "./_components/stats-overview";
import { PhotosTab } from "./_components/photos-tab";
import { HistoryTab } from "./_components/history-tab";
import { ProgressSkeleton } from "./_components/progress-skeleton";

const ProgressCharts = dynamic(
  () => import("@/components/charts/ProgressCharts"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="border-b-4 border-black bg-primary p-4 h-[72px] animate-pulse" />
          <div className="p-6">
            <div className="h-[300px] bg-neutral-100 animate-pulse" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] h-[200px] animate-pulse" />
          <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] h-[200px] animate-pulse" />
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

const supabase = createClient();

async function fetchCheckIns(userId: string | undefined): Promise<CheckIn[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("check_ins")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as CheckIn[];
}

async function fetchAdherenceStats(userId: string | undefined, days: number) {
  if (!userId) return { mealAdherence: 0, workoutAdherence: 0 };
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split("T")[0];

  const { data: mealCompletions } = await supabase
    .from("meal_completions")
    .select("completed")
    .eq("user_id", userId)
    .gte("date", startDateStr);

  const { data: workoutCompletions } = await supabase
    .from("workout_completions")
    .select("completed")
    .eq("user_id", userId)
    .gte("date", startDateStr);

  const mealTotal = mealCompletions?.length || 0;
  const mealCompleted = (mealCompletions as MealCompletion[] | null)?.filter((m) => m.completed).length || 0;
  const mealAdherence = mealTotal > 0 ? (mealCompleted / mealTotal) * 100 : 0;

  const workoutTotal = workoutCompletions?.length || 0;
  const workoutCompleted = (workoutCompletions as WorkoutCompletion[] | null)?.filter((w) => w.completed).length || 0;
  const workoutAdherence = workoutTotal > 0 ? (workoutCompleted / workoutTotal) * 100 : 0;

  return { mealAdherence, workoutAdherence };
}

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export default function ProgressPage() {
  const t = useTranslations("progress");
  const [dateRange, setDateRange] = useState<DateRange>("30");
  const [activeTab, setActiveTab] = useState<"charts" | "photos" | "history">("charts");

  const { data: user } = useSWR("user", getCurrentUser);
  const { data: checkIns = [], isLoading: checkInsLoading } = useSWR(
    user ? ["check-ins", user.id] : null,
    () => fetchCheckIns(user?.id)
  );
  const { data: adherenceStats = { mealAdherence: 0, workoutAdherence: 0 } } = useSWR(
    user ? ["adherence", user.id, dateRange] : null,
    () => fetchAdherenceStats(user?.id, dateRange === "30" ? 30 : dateRange === "90" ? 90 : 365)
  );

  const filteredCheckIns = useMemo(() => {
    if (dateRange === "all") return checkIns;
    const days = dateRange === "30" ? 30 : 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return checkIns.filter((checkIn) => new Date(checkIn.created_at) >= cutoffDate);
  }, [checkIns, dateRange]);

  const weightChartData = useMemo(() => {
    return filteredCheckIns
      .filter((checkIn) => checkIn.weight)
      .map((checkIn) => ({
        date: new Date(checkIn.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        weight: checkIn.weight,
      }));
  }, [filteredCheckIns]);

  const measurementChartData = useMemo(() => {
    return filteredCheckIns
      .filter((checkIn) => checkIn.measurements)
      .map((checkIn) => {
        const measurements = checkIn.measurements as MeasurementData;
        return {
          date: new Date(checkIn.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          chest: measurements.chest,
          waist: measurements.waist,
          hips: measurements.hips,
          arms: measurements.arms,
          thighs: measurements.thighs,
        };
      });
  }, [filteredCheckIns]);

  const firstCheckIn = filteredCheckIns[0];
  const latestCheckIn = filteredCheckIns[filteredCheckIns.length - 1];
  const weightChange = latestCheckIn?.weight && firstCheckIn?.weight
    ? latestCheckIn.weight - firstCheckIn.weight
    : 0;
  const weightChangePercent = firstCheckIn?.weight
    ? ((weightChange / firstCheckIn.weight) * 100).toFixed(1)
    : "0";

  const allPhotos = useMemo(() => {
    return filteredCheckIns
      .filter((checkIn) => checkIn.progress_photo_urls && checkIn.progress_photo_urls.length > 0)
      .flatMap((checkIn) =>
        (checkIn.progress_photo_urls || []).map((url: string) => ({
          url,
          date: new Date(checkIn.created_at).toLocaleDateString(),
        }))
      );
  }, [filteredCheckIns]);

  if (checkInsLoading) {
    return <ProgressSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-4 border-black bg-black p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center bg-primary">
              <Activity className="h-6 w-6 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-cream tracking-tight">
                {t("title").toUpperCase()}
              </h1>
              <p className="font-mono text-xs tracking-[0.2em] text-primary">
                {t("description").toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex gap-0">
            {(["30", "90", "all"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`h-12 px-4 border-4 border-black -ms-1 first:ms-0 font-black text-xs uppercase transition-colors ${
                  dateRange === range ? "bg-primary text-black z-10" : "bg-cream text-black hover:bg-neutral-100"
                }`}
              >
                {range === "30" ? t("days30").toUpperCase() : range === "90" ? t("days90").toUpperCase() : t("all").toUpperCase()}
              </button>
            ))}
          </div>
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
      <div className="flex gap-0">
        {(["charts", "photos", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 h-14 border-4 border-black -ms-1 first:ms-0 font-black text-sm uppercase tracking-wide transition-colors flex items-center justify-center gap-2 ${
              activeTab === tab ? "bg-black text-cream" : "bg-cream text-black hover:bg-neutral-100"
            }`}
          >
            {tab === "charts" && <Activity className="h-4 w-4" />}
            {tab === "photos" && <Camera className="h-4 w-4" />}
            {tab === "history" && <Calendar className="h-4 w-4" />}
            {tab === "charts" ? t("charts").toUpperCase() : tab === "photos" ? t("photos").toUpperCase() : t("history").toUpperCase()}
          </button>
        ))}
      </div>

      {/* Charts Tab */}
      {activeTab === "charts" && (
        <ProgressCharts
          weightChartData={weightChartData}
          measurementChartData={measurementChartData}
          adherenceStats={adherenceStats}
        />
      )}

      {/* Photos Tab */}
      {activeTab === "photos" && <PhotosTab photos={allPhotos} />}

      {/* History Tab */}
      {activeTab === "history" && <HistoryTab checkIns={filteredCheckIns} />}
    </div>
  );
}
