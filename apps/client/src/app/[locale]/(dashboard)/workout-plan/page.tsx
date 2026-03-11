"use client";

import { useTranslations, useLocale } from "next-intl";
import { toLocalDigits } from "@/lib/utils";
import { useCurrentWorkoutPlan } from "@/hooks/use-workout-plans";
import {
  Dumbbell,
  Moon,
  Loader2,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ArrowLeftRight,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@fitfast/ui/cn";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePlanStream } from "@/hooks/use-plan-stream";

import { EmptyState } from "@fitfast/ui/empty-state";
import { DayNavigator } from "../meal-plan/_components/day-navigator";
import { ExerciseGif } from "./_components/exercise-gif";
import { useExerciseMedia } from "@/hooks/use-exercise-media";
import type { GeneratedWorkoutPlan } from "@/lib/ai/workout-plan-generator";

/** Normalized exercise used in the main workout section */
interface NormalizedExercise {
  name: string;
  exerciseDbId?: string;
  sets: number;
  reps: string;
  rest: string;
  targetMuscles: string[];
  instructions: string[];
  equipment: string;
  notes: string;
}

/** Warmup/cooldown exercise */
interface WarmupCooldownExercise {
  name: string;
  exerciseDbId?: string;
  duration: number;
  instructions: string[];
}

/** Normalized workout day plan */
interface NormalizedWorkoutDay {
  workoutName: string;
  duration: number | null;
  targetMuscles: string[];
  restDay: boolean;
  exercises: NormalizedExercise[];
  warmup: { exercises: WarmupCooldownExercise[] };
  cooldown: { exercises: WarmupCooldownExercise[] };
}

/** Raw workout day data from AI output (may have old or new field names) */
interface RawWorkoutDay {
  workoutName?: string;
  name?: string;
  duration?: number;
  targetMuscles?: string[];
  musclesTargeted?: string[];
  restDay?: boolean;
  exercises?: RawExercise[];
  workout?: RawExercise[];
  warmup?: RawWarmupCooldown;
  warmUp?: RawWarmupCooldown;
  cooldown?: RawWarmupCooldown;
  coolDown?: RawWarmupCooldown;
}

interface RawExercise {
  name?: string;
  exercise?: string;
  exerciseDbId?: string;
  sets?: number;
  reps?: string;
  rest?: string | number;
  restBetweenSets?: string;
  targetMuscles?: string[];
  musclesTargeted?: string[];
  instructions?: string[];
  equipment?: string;
  notes?: string;
}

interface RawWarmupCooldown {
  exercises?: WarmupCooldownExercise[];
  cardio?: string;
  duration?: number;
  dynamicStretching?: string[];
  staticStretching?: string[];
}

// Resolve the day plan from weeklyPlan — tries "dayN" format first, then weekday names
function resolveDayPlan(
  weeklyPlan: Record<string, RawWorkoutDay>,
  dayIndex: number,
  startDate?: string,
): RawWorkoutDay | null {
  const dayKey = `day${dayIndex + 1}`;
  if (weeklyPlan[dayKey]) return weeklyPlan[dayKey];

  if (startDate) {
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayIndex);
    const weekdayName = dayNames[date.getDay()];
    if (weeklyPlan[weekdayName]) return weeklyPlan[weekdayName];
  }

  return null;
}

// Normalize a workout day to handle both old format (workout[], warmUp/coolDown)
// and new format (exercises[], warmup/cooldown)
function normalizeWorkoutDay(raw: RawWorkoutDay | null): NormalizedWorkoutDay | null {
  if (!raw) return null;

  const rawExercises: RawExercise[] = Array.isArray(raw.exercises)
    ? raw.exercises
    : Array.isArray(raw.workout)
      ? raw.workout
      : [];

  const exercises: NormalizedExercise[] = rawExercises.map((ex) => ({
    name: ex.name || ex.exercise || "",
    exerciseDbId: ex.exerciseDbId,
    sets: ex.sets || 0,
    reps: ex.reps || "",
    rest: String(ex.rest || ex.restBetweenSets || "-"),
    targetMuscles: Array.isArray(ex.targetMuscles)
      ? ex.targetMuscles
      : Array.isArray(ex.musclesTargeted)
        ? ex.musclesTargeted
        : [],
    instructions: Array.isArray(ex.instructions) ? ex.instructions : [],
    equipment: ex.equipment || "",
    notes: ex.notes || "",
  }));

  let warmupExercises: WarmupCooldownExercise[] = [];
  const warmup = raw.warmup || raw.warmUp;
  if (warmup) {
    if (Array.isArray(warmup.exercises) && warmup.exercises.length > 0) {
      warmupExercises = warmup.exercises;
    } else {
      if (warmup.cardio) {
        warmupExercises.push({
          name: warmup.cardio,
          duration: warmup.duration || 60,
          instructions: [],
        });
      }
      if (Array.isArray(warmup.dynamicStretching)) {
        warmup.dynamicStretching.forEach((s: string) => {
          warmupExercises.push({ name: s, duration: 30, instructions: [] });
        });
      }
    }
  }

  let cooldownExercises: WarmupCooldownExercise[] = [];
  const cooldown = raw.cooldown || raw.coolDown;
  if (cooldown) {
    if (Array.isArray(cooldown.exercises) && cooldown.exercises.length > 0) {
      cooldownExercises = cooldown.exercises;
    } else {
      if (Array.isArray(cooldown.staticStretching)) {
        cooldown.staticStretching.forEach((s: string) => {
          cooldownExercises.push({ name: s, duration: 30, instructions: [] });
        });
      }
    }
  }

  return {
    workoutName: raw.workoutName || raw.name || "",
    duration: raw.duration || null,
    targetMuscles: Array.isArray(raw.targetMuscles)
      ? raw.targetMuscles
      : Array.isArray(raw.musclesTargeted)
        ? raw.musclesTargeted
        : [],
    restDay: raw.restDay || false,
    exercises,
    warmup: { exercises: warmupExercises },
    cooldown: { exercises: cooldownExercises },
  };
}

/** Compute total duration of warmup/cooldown exercises in minutes */
function sectionDurationMinutes(exercises: WarmupCooldownExercise[]): number {
  const totalSec = exercises.reduce((sum, ex) => sum + (ex.duration || 0), 0);
  return Math.max(1, Math.round(totalSec / 60));
}

export default function WorkoutPlanPage() {
  const t = useTranslations("workouts");
  const tCommon = useTranslations("common");
  const tEmpty = useTranslations("emptyStates");
  const tUnits = useTranslations("units");
  const locale = useLocale();
  const { workoutPlan, isLoading, error } = useCurrentWorkoutPlan();
  const assessment = useQuery(api.assessments.getMyAssessment);
  const swapExercise = useMutation(api.workoutPlans.swapExercise);
  const [swappingKey, setSwappingKey] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const [selectedDay, setSelectedDay] = useState(0);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(0);

  // Translation: detect locale mismatch and auto-translate
  const requestTranslation = useAction(api.workoutPlans.requestTranslation);
  const translationRequested = useRef(false);
  const planLanguage = workoutPlan?.language;
  const needsTranslation = !!workoutPlan && !!planLanguage && planLanguage !== locale;
  const hasTranslation =
    needsTranslation &&
    workoutPlan?.translatedLanguage === locale &&
    !!workoutPlan?.translatedPlanData;

  useEffect(() => {
    if (needsTranslation && !hasTranslation && !translationRequested.current) {
      translationRequested.current = true;
      requestTranslation({ targetLanguage: locale as "en" | "ar" }).catch(console.error);
    }
  }, [needsTranslation, hasTranslation, locale, requestTranslation]);

  // Reset translation ref when plan changes
  useEffect(() => {
    translationRequested.current = false;
  }, [workoutPlan?._id]);

  // Streaming support
  const streamId = workoutPlan?.streamId;
  const { streamedText, isStreaming } = usePlanStream(
    workoutPlan &&
      (!workoutPlan.planData || (workoutPlan.planData as Record<string, unknown>)?.parseError)
      ? streamId
      : undefined,
  );

  // Compute today's day index from plan start date
  const maxDayIndex =
    workoutPlan?.startDate && workoutPlan?.endDate
      ? Math.ceil(
          (new Date(workoutPlan.endDate).getTime() - new Date(workoutPlan.startDate).getTime()) /
            86400000,
        ) - 1
      : 13;
  const todayDayIndex = workoutPlan?.startDate
    ? Math.max(
        0,
        Math.min(
          maxDayIndex,
          Math.floor((now - new Date(workoutPlan.startDate).getTime()) / 86400000),
        ),
      )
    : 0;

  // Auto-select today (setState during render, guarded by dayInitialized)
  const [dayInitialized, setDayInitialized] = useState(false);
  if (workoutPlan?.startDate && !dayInitialized) {
    setSelectedDay(todayDayIndex);
    setDayInitialized(true);
  }

  // Dynamic total days
  const totalDays =
    workoutPlan?.startDate && workoutPlan?.endDate
      ? Math.ceil(
          (new Date(workoutPlan.endDate).getTime() - new Date(workoutPlan.startDate).getTime()) /
            86400000,
        )
      : 10;

  // Pre-compute current day's exercises for the media hook (must run before early returns)
  const currentDayExercises = (() => {
    if (!workoutPlan?.planData) return [];
    const pd = (needsTranslation && hasTranslation
      ? workoutPlan.translatedPlanData
      : workoutPlan.planData) as unknown as GeneratedWorkoutPlan & { splitType?: string };
    if (!pd?.weeklyPlan) return [];
    const raw = resolveDayPlan(pd.weeklyPlan, selectedDay, workoutPlan.startDate);
    const day = normalizeWorkoutDay(raw);
    return day?.exercises ?? [];
  })();
  const exerciseMedia = useExerciseMedia(currentDayExercises);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  // Show streaming banner while AI generates the plan (only if planData not yet parsed)
  if (workoutPlan && isStreaming && streamedText && !workoutPlan.planData) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{t("generating")}</p>
        </div>
        <div className="border-fitness/30 bg-fitness/5 rounded-xl border p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="text-fitness h-4 w-4 animate-pulse" />
            <span className="text-fitness text-sm font-semibold">{t("aiGenerating")}</span>
          </div>
          <pre className="text-muted-foreground max-h-96 overflow-y-auto font-sans text-sm leading-relaxed whitespace-pre-wrap">
            {streamedText}
          </pre>
        </div>
      </div>
    );
  }

  if (error || !workoutPlan) {
    const isPlansGenerating = !workoutPlan && !!assessment;
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("getStarted")}</p>
        </div>
        {isPlansGenerating ? (
          <div className="border-border bg-card space-y-4 rounded-xl border p-8 text-center">
            <Loader2 className="text-primary mx-auto h-10 w-10 animate-spin" />
            <h2 className="text-lg font-bold">{tEmpty("workoutPlanGenerating.title")}</h2>
            <p className="text-muted-foreground mx-auto max-w-md text-sm">
              {tEmpty("workoutPlanGenerating.description")}
            </p>
          </div>
        ) : (
          <EmptyState
            icon={Dumbbell}
            title={tEmpty("noWorkoutPlan.title")}
            description={tEmpty("noWorkoutPlan.description")}
          />
        )}
      </div>
    );
  }

  const planData = (needsTranslation && hasTranslation
    ? workoutPlan.translatedPlanData
    : workoutPlan.planData) as unknown as GeneratedWorkoutPlan & {
    splitType?: string;
    splitName?: string;
    splitDescription?: string;
  };
  const rawDayPlan = resolveDayPlan(planData.weeklyPlan, selectedDay, workoutPlan.startDate);
  const dayPlan = normalizeWorkoutDay(rawDayPlan);

  // Find next workout for rest day preview
  const findNextWorkout = () => {
    for (let i = selectedDay + 1; i < totalDays; i++) {
      const raw = resolveDayPlan(planData.weeklyPlan, i, workoutPlan.startDate);
      const normalized = normalizeWorkoutDay(raw);
      if (normalized && !normalized.restDay) {
        return normalized;
      }
    }
    return null;
  };

  // Find previous workout for rest day recovery context
  const findPrevWorkout = () => {
    for (let i = selectedDay - 1; i >= 0; i--) {
      const raw = resolveDayPlan(planData.weeklyPlan, i, workoutPlan.startDate);
      const normalized = normalizeWorkoutDay(raw);
      if (normalized && !normalized.restDay) {
        return normalized;
      }
    }
    return null;
  };

  const isToday = selectedDay === todayDayIndex;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 lg:px-6">
      {/* Hero header — title, split badge, date range, and workout summary */}
      <div className="border-border bg-card shadow-card animate-slide-up overflow-hidden rounded-2xl border">
        {/* Top: title row + split badge */}
        <div className="border-border border-b p-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">{isToday ? t("todaysWorkout") : t("title")}</h1>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {new Date(workoutPlan.startDate).toLocaleDateString(
                  locale === "ar" ? "ar-EG" : "en",
                )}{" "}
                –{" "}
                {new Date(workoutPlan.endDate).toLocaleDateString(locale === "ar" ? "ar-EG" : "en")}
              </p>
            </div>
            {planData.splitName && (
              <span className="bg-fitness/10 text-fitness shrink-0 rounded-full px-3 py-1 text-xs font-semibold">
                {planData.splitName}
              </span>
            )}
          </div>
        </div>

        {/* Bottom: inline stats row — only when we have a non-rest day */}
        {dayPlan && !dayPlan.restDay && (
          <div className="divide-border flex items-center divide-x">
            <div className="flex-1 py-3 text-center">
              <p className="text-fitness text-lg font-bold">
                {toLocalDigits(dayPlan.exercises?.length || 0, locale)}
              </p>
              <p className="text-muted-foreground text-[10px]">{t("exercises")}</p>
            </div>
            <div className="flex-1 py-3 text-center">
              <p className="text-fitness text-lg font-bold">
                {dayPlan.duration ? toLocalDigits(dayPlan.duration, locale) : "–"}
              </p>
              <p className="text-muted-foreground text-[10px]">{t("durationMin")}</p>
            </div>
            <div className="flex-1 py-3 text-center">
              <p className="text-xs leading-tight font-semibold">
                {Array.isArray(dayPlan.targetMuscles)
                  ? dayPlan.targetMuscles.slice(0, 3).join(", ")
                  : "–"}
              </p>
              <p className="text-muted-foreground text-[10px]">{t("targetMuscles")}</p>
            </div>
          </div>
        )}
      </div>

      {/* DayNavigator — compact prev/next (kept as-is, user likes this chip) */}
      <DayNavigator
        totalDays={totalDays}
        selectedDay={selectedDay}
        onSelectDay={(day) => {
          setSelectedDay(day);
          setExpandedExercise(0);
        }}
        planStartDate={workoutPlan.startDate}
        todayDayIndex={todayDayIndex}
        featureColor="fitness"
      />

      {/* Translating banner */}
      {needsTranslation && !hasTranslation && (
        <div className="border-primary/30 bg-primary/5 flex items-center gap-3 rounded-xl border p-4">
          <Loader2 className="text-primary h-5 w-5 shrink-0 animate-spin" />
          <div>
            <p className="text-primary text-sm font-semibold">{t("translating")}</p>
            <p className="text-muted-foreground text-xs">{t("translatingDescription")}</p>
          </div>
        </div>
      )}

      {/* Today's Workout */}
      {dayPlan && (
        <>
          {dayPlan.restDay ? (
            <RestDayView t={t} prevWorkout={findPrevWorkout()} nextWorkout={findNextWorkout()} />
          ) : (
            <>
              {/* Stats are now in the hero header — no standalone card needed */}

              {/* Warmup (collapsed by default) */}
              {dayPlan.warmup.exercises.length > 0 && (
                <CollapsibleSection
                  title={t("warmup")}
                  durationMins={sectionDurationMinutes(dayPlan.warmup.exercises)}
                  tUnits={tUnits}
                  locale={locale}
                  colorClass="bg-amber-50 border-amber-200"
                  badgeClass="bg-amber-100 text-amber-700"
                >
                  <div className="divide-border divide-y">
                    {dayPlan.warmup.exercises.map((exercise, index) => (
                      <div key={index} className="p-4">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-sm font-medium">{exercise.name}</span>
                          <span className="text-muted-foreground rounded-md bg-neutral-100 px-2 py-0.5 text-xs">
                            {toLocalDigits(exercise.duration, locale)}
                            {tUnits("sec")}
                          </span>
                        </div>
                        <ul className="text-muted-foreground space-y-0.5 text-xs">
                          {(Array.isArray(exercise.instructions) ? exercise.instructions : []).map(
                            (instruction: string, i: number) => (
                              <li key={i}>&#8226; {instruction}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Exercise Mini-Cards */}
              <div className="space-y-3">
                {(dayPlan.exercises ?? []).map((exercise, index) => {
                  const isExpanded = expandedExercise === index;

                  return (
                    <div
                      key={index}
                      className={cn(
                        "bg-card shadow-card animate-slide-up overflow-hidden rounded-xl border transition-colors",
                        isExpanded ? "border-primary/40 ring-primary/10 ring-2" : "border-border",
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Exercise Header */}
                      <button
                        onClick={() => setExpandedExercise(isExpanded ? null : index)}
                        aria-expanded={isExpanded}
                        className="flex w-full items-center justify-between gap-3 p-3.5 text-start transition-colors hover:bg-neutral-50 active:scale-[0.97]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors",
                              isExpanded ? "bg-primary text-white" : "bg-fitness/10 text-fitness",
                            )}
                          >
                            {toLocalDigits(String(index + 1).padStart(2, "0"), locale)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-semibold">{exercise.name}</h4>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {toLocalDigits(exercise.sets, locale)}x
                              {toLocalDigits(exercise.reps, locale)} {t("reps")}
                              {exercise.rest && exercise.rest !== "-" && (
                                <span className="text-muted-foreground/70">
                                  {" "}
                                  · {toLocalDigits(exercise.rest, locale)} {t("rest")}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {/* Equipment badge (visible in collapsed state) */}
                          {exercise.equipment && (
                            <span className="bg-fitness/8 text-fitness hidden rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-block">
                              {exercise.equipment}
                            </span>
                          )}
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-all duration-200",
                              isExpanded ? "text-primary rotate-180" : "text-muted-foreground",
                            )}
                          />
                        </div>
                      </button>

                      {/* Swap Exercise Button */}
                      {isExpanded && workoutPlan && (
                        <div className="border-border flex justify-end border-t px-3.5 py-2">
                          <button
                            type="button"
                            disabled={swappingKey === `${selectedDay}-${index}`}
                            onClick={async (e) => {
                              e.stopPropagation();
                              const key = `${selectedDay}-${index}`;
                              setSwappingKey(key);
                              try {
                                await swapExercise({
                                  planId: workoutPlan._id,
                                  dayKey: `day${selectedDay + 1}`,
                                  exerciseIndex: index,
                                });
                              } catch (err) {
                                console.error("Swap failed:", err);
                              } finally {
                                setSwappingKey((prev) => (prev === key ? null : prev));
                              }
                            }}
                            className="text-fitness hover:bg-fitness/10 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            {swappingKey === `${selectedDay}-${index}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ArrowLeftRight className="h-3.5 w-3.5" />
                            )}
                            {swappingKey === `${selectedDay}-${index}`
                              ? t("swapping")
                              : t("swapExercise")}
                          </button>
                        </div>
                      )}

                      {/* Expanded Content */}
                      <div
                        className={cn(
                          "overflow-hidden transition-all duration-200 ease-in-out",
                          isExpanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0",
                        )}
                      >
                        <div className="border-border space-y-3 border-t px-3.5 pt-3 pb-3.5">
                          {/* Exercise image — prefer new AI-generated images over old external URLs */}
                          {exercise.exerciseDbId &&
                            exerciseMedia[exercise.exerciseDbId] &&
                            (exerciseMedia[exercise.exerciseDbId].gifStorageUrl ||
                              exerciseMedia[exercise.exerciseDbId].gifUrl) && (
                              <ExerciseGif
                                url={
                                  (exerciseMedia[exercise.exerciseDbId].gifStorageUrl ||
                                    exerciseMedia[exercise.exerciseDbId].gifUrl)!
                                }
                                alt={exercise.name}
                              />
                            )}

                          {/* Muscle tags */}
                          {exercise.targetMuscles && exercise.targetMuscles.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {exercise.targetMuscles.map((muscle: string, mi: number) => (
                                <span
                                  key={mi}
                                  className="bg-fitness/10 text-fitness rounded-full px-2 py-0.5 text-[10px] font-medium"
                                >
                                  {muscle}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Sets / Reps / Rest grid */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-lg bg-neutral-50 p-2 text-center">
                              <p className="text-sm font-bold">
                                {toLocalDigits(exercise.sets, locale)}
                              </p>
                              <p className="text-muted-foreground text-[10px]">{t("sets")}</p>
                            </div>
                            <div className="rounded-lg bg-neutral-50 p-2 text-center">
                              <p className="text-sm font-bold">
                                {toLocalDigits(exercise.reps, locale)}
                              </p>
                              <p className="text-muted-foreground text-[10px]">{t("reps")}</p>
                            </div>
                            <div className="rounded-lg bg-neutral-50 p-2 text-center">
                              <p className="text-sm font-bold">
                                {exercise.rest ? toLocalDigits(exercise.rest, locale) : "-"}
                              </p>
                              <p className="text-muted-foreground text-[10px]">{t("rest")}</p>
                            </div>
                          </div>

                          {/* Equipment */}
                          {exercise.equipment && (
                            <span className="bg-fitness/12 text-fitness inline-block rounded-md px-2.5 py-1 text-xs font-medium">
                              {exercise.equipment}
                            </span>
                          )}

                          {/* Notes */}
                          {exercise.notes && (
                            <p className="text-muted-foreground rounded-lg bg-neutral-50 p-2.5 text-xs italic">
                              {exercise.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cooldown (collapsed by default) */}
              {dayPlan.cooldown.exercises.length > 0 && (
                <CollapsibleSection
                  title={t("cooldown")}
                  durationMins={sectionDurationMinutes(dayPlan.cooldown.exercises)}
                  tUnits={tUnits}
                  locale={locale}
                  colorClass="bg-blue-50 border-blue-200"
                  badgeClass="bg-blue-100 text-blue-700"
                >
                  <div className="divide-border divide-y">
                    {dayPlan.cooldown.exercises.map((exercise, index) => (
                      <div key={index} className="p-4">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-sm font-medium">{exercise.name}</span>
                          <span className="text-muted-foreground rounded-md bg-neutral-100 px-2 py-0.5 text-xs">
                            {toLocalDigits(exercise.duration, locale)}
                            {tUnits("sec")}
                          </span>
                        </div>
                        <ul className="text-muted-foreground space-y-0.5 text-xs">
                          {(Array.isArray(exercise.instructions) ? exercise.instructions : []).map(
                            (instruction: string, i: number) => (
                              <li key={i}>&#8226; {instruction}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}
            </>
          )}
        </>
      )}

      {/* Progression Notes */}
      {planData.progressionNotes && (
        <div className="border-fitness/20 bg-fitness/8 rounded-xl border p-4">
          <p className="text-muted-foreground mb-1 text-xs font-medium">{t("progressionNotes")}</p>
          <p className="text-sm font-medium">{planData.progressionNotes}</p>
        </div>
      )}

      {/* Safety Tips */}
      {planData.safetyTips && planData.safetyTips.length > 0 && (
        <div className="bg-error-500/5 border-error-500/20 rounded-xl border p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="text-error-500 h-4 w-4" />
            <p className="text-error-500 text-xs font-semibold">{t("safetyTips")}</p>
          </div>
          <ul className="space-y-1.5">
            {planData.safetyTips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="text-error-500 mt-0.5">!</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Collapsible Warmup/Cooldown Section ──────────────────────────────────────

function CollapsibleSection({
  title,
  durationMins,
  tUnits,
  locale,
  colorClass,
  badgeClass,
  children,
}: {
  title: string;
  durationMins: number;
  tUnits: ReturnType<typeof useTranslations>;
  locale: string;
  colorClass: string;
  badgeClass: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = `section-panel-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className={cn("animate-slide-up overflow-hidden rounded-xl border", colorClass)}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between p-4 text-start"
      >
        <div className="flex items-center gap-2">
          <span className={cn("rounded-md px-2 py-0.5 text-xs font-bold", badgeClass)}>
            {title}
          </span>
          <span className="text-muted-foreground text-xs">
            · {toLocalDigits(durationMins, locale)} {tUnits("min")}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "text-muted-foreground h-4 w-4 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        id={panelId}
        role="region"
        className={cn(
          "overflow-hidden transition-all duration-200",
          open ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        {children}
      </div>
    </div>
  );
}

// ── Enhanced Rest Day View ───────────────────────────────────────────────────

function RestDayView({
  t,
  prevWorkout,
  nextWorkout,
}: {
  t: ReturnType<typeof useTranslations>;
  prevWorkout: NormalizedWorkoutDay | null;
  nextWorkout: NormalizedWorkoutDay | null;
}) {
  return (
    <div className="border-border bg-card shadow-card animate-slide-up space-y-4 rounded-xl border p-8 text-center">
      {/* Icon */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
        <Moon className="h-8 w-8 text-blue-400" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold">{t("restDayTitle")}</h3>
      <p className="text-muted-foreground mx-auto max-w-sm text-sm">{t("restDescription")}</p>

      {/* Recovery context */}
      {prevWorkout && prevWorkout.workoutName && (
        <p className="text-muted-foreground text-sm">
          {t("restDayRecovery", { workout: prevWorkout.workoutName })}
        </p>
      )}

      {/* Next workout preview */}
      {nextWorkout && (
        <div className="mx-auto max-w-xs rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-start">
          <p className="mb-1 text-xs font-semibold text-blue-600">{t("nextWorkout")}</p>
          <p className="text-sm font-medium">{nextWorkout.workoutName}</p>
          {nextWorkout.targetMuscles.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {nextWorkout.targetMuscles.map((muscle, i) => (
                <span
                  key={i}
                  className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700"
                >
                  {muscle}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
