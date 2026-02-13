"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  TrendingDown,
  TrendingUp,
  Calendar,
  Image as ImageIcon,
  Activity,
  Weight,
  Camera,
  X,
} from "lucide-react";
import type { CheckIn, MealCompletion, WorkoutCompletion } from "@/types/database";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

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
  const tEmpty = useTranslations("emptyStates");
  const tUnits = useTranslations("units");
  const tCheckIn = useTranslations("checkIn");
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange>("30");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
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
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="border-4 border-black bg-black p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex gap-0">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-16 -ms-1 first:ms-0" />
              ))}
            </div>
          </div>
        </div>

        {/* Stats overview skeleton */}
        <div className="grid gap-0 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`border-4 border-black -ms-0 md:-ms-1 first:ms-0 -mt-1 md:-mt-0 first:mt-0 ${i === 3 ? 'bg-primary' : 'bg-cream'} p-5`}>
              <Skeleton className={`h-4 w-20 mb-2 ${i === 3 ? 'bg-white/20' : ''}`} />
              <Skeleton className={`h-10 w-16 mb-1 ${i === 3 ? 'bg-white/20' : ''}`} />
              <Skeleton className={`h-3 w-24 ${i === 3 ? 'bg-white/20' : ''}`} />
            </div>
          ))}
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-0">
          <Skeleton className="flex-1 h-14" />
        </div>

        {/* Chart area skeleton */}
        <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="border-b-4 border-black bg-primary p-4">
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="p-6">
            <Skeleton className="h-[300px] w-full" />
          </div>
        </div>
      </div>
    );
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
          <p className="text-3xl font-black text-white">{filteredCheckIns.length}</p>
          <p className="font-bold text-sm text-white/80 mt-1">{t("totalRecorded").toUpperCase()}</p>
        </div>
      </div>

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
      {activeTab === "photos" && (
        <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="border-b-4 border-black bg-primary p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-black">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-black text-xl text-black tracking-tight">
                {t("progressPhotos").toUpperCase()}
              </h2>
              <p className="font-mono text-xs text-black/70">{t("progressPhotosDescription").toUpperCase()}</p>
            </div>
          </div>
          <div className="p-6">
            {allPhotos.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allPhotos.map((photo, index) => (
                  <div
                    key={index}
                    className="group relative cursor-pointer border-4 border-black overflow-hidden transition-transform hover:scale-[1.02]"
                    onClick={() => setSelectedPhoto(photo.url)}
                  >
                    <div className="relative aspect-[3/4] bg-neutral-100">
                      <Image
                        src={photo.url}
                        alt={`Progress photo from ${photo.date}`}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
                        className="object-cover"
                      />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black p-2">
                      <p className="text-xs font-mono text-cream">{photo.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ImageIcon}
                title={tEmpty("noPhotos.title")}
                description={tEmpty("noPhotos.description")}
                action={{
                  label: tEmpty("noPhotos.action"),
                  onClick: () => router.push("/check-in"),
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="border-b-4 border-black bg-black p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-primary">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-black text-xl text-cream tracking-tight">
                {t("checkInHistory").toUpperCase()}
              </h2>
              <p className="font-mono text-xs text-primary">{t("checkInHistoryDescription").toUpperCase()}</p>
            </div>
          </div>
          <div className="divide-y-4 divide-black">
            {filteredCheckIns.length > 0 ? (
              filteredCheckIns.slice().reverse().map((checkIn) => {
                const measurements = checkIn.measurements as MeasurementData;
                return (
                  <div key={checkIn.id} className="p-5 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-black">
                          {new Date(checkIn.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                        <p className="font-mono text-xs text-neutral-500">
                          {new Date(checkIn.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {checkIn.weight && (
                        <div className="border-4 border-primary bg-primary/10 px-3 py-1">
                          <span className="text-2xl font-black text-primary">{checkIn.weight}</span>
                          <span className="font-mono text-xs text-primary ml-1">{tUnits("kg") || "KG"}</span>
                        </div>
                      )}
                    </div>

                    {measurements && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                        {measurements.chest && (
                          <div className="border-2 border-black bg-neutral-100 p-2">
                            <p className="font-bold text-sm text-neutral-500">{tCheckIn("chest").toUpperCase()}</p>
                            <p className="font-black">{measurements.chest} {tUnits("cm")}</p>
                          </div>
                        )}
                        {measurements.waist && (
                          <div className="border-2 border-black bg-neutral-100 p-2">
                            <p className="font-bold text-sm text-neutral-500">{tCheckIn("waist").toUpperCase()}</p>
                            <p className="font-black">{measurements.waist} {tUnits("cm")}</p>
                          </div>
                        )}
                        {measurements.hips && (
                          <div className="border-2 border-black bg-neutral-100 p-2">
                            <p className="font-bold text-sm text-neutral-500">{tCheckIn("hips").toUpperCase()}</p>
                            <p className="font-black">{measurements.hips} {tUnits("cm")}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 font-bold text-sm">
                      {checkIn.energy_level !== null && (
                        <span>{tCheckIn("energy").toUpperCase()}: <span className="font-black">{checkIn.energy_level}/10</span></span>
                      )}
                      {checkIn.sleep_quality !== null && (
                        <span>{tCheckIn("sleep").toUpperCase()}: <span className="font-black">{checkIn.sleep_quality}/10</span></span>
                      )}
                      {checkIn.dietary_adherence !== null && (
                        <span>{tCheckIn("adherence").toUpperCase()}: <span className="font-black">{checkIn.dietary_adherence}/10</span></span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                icon={Calendar}
                title={tEmpty("noCheckIns.title")}
                description={tEmpty("noCheckIns.description")}
                action={{
                  label: tEmpty("noCheckIns.action"),
                  onClick: () => router.push("/check-in"),
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-3xl w-full border-4 border-black bg-cream" onClick={(e) => e.stopPropagation()}>
            <div className="border-b-4 border-black bg-black p-3 flex items-center justify-between">
              <span className="font-black text-cream">{t("progressPhoto").toUpperCase()}</span>
              <button onClick={() => setSelectedPhoto(null)} className="h-12 w-12 bg-primary flex items-center justify-center hover:bg-cream hover:text-black transition-colors text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <Image src={selectedPhoto} alt="Progress photo" width={800} height={600} className="w-full h-auto" />
          </div>
        </div>
      )}
    </div>
  );
}
