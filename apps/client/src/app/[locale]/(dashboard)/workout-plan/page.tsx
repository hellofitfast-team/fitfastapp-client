"use client";

import { useTranslations, useLocale } from "next-intl";
import { useCurrentWorkoutPlan } from "@/hooks/use-workout-plans";
import {
  Dumbbell,
  Clock,
  RefreshCw,
  Zap,
  Target,
  Loader2,
  AlertTriangle,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { cn } from "@fitfast/ui/cn";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePlanStream } from "@/hooks/use-plan-stream";
import { EmptyState } from "@fitfast/ui/empty-state";
import { WidgetCard } from "@fitfast/ui/widget-card";
import { DaySelector } from "../meal-plan/_components/day-selector";
import type { GeneratedWorkoutPlan } from "@/lib/ai/workout-plan-generator";

/** Normalized exercise used in the main workout section */
interface NormalizedExercise {
  name: string;
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

  // Handle exercise list: old format uses "workout" array, new uses "exercises"
  const rawExercises: RawExercise[] = Array.isArray(raw.exercises)
    ? raw.exercises
    : Array.isArray(raw.workout)
      ? raw.workout
      : [];

  const exercises: NormalizedExercise[] = rawExercises.map((ex) => ({
    name: ex.name || ex.exercise || "",
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

  // Normalize warmup: old format has warmUp.cardio + warmUp.dynamicStretching
  let warmupExercises: WarmupCooldownExercise[] = [];
  const warmup = raw.warmup || raw.warmUp;
  if (warmup) {
    if (Array.isArray(warmup.exercises) && warmup.exercises.length > 0) {
      warmupExercises = warmup.exercises;
    } else {
      // Old format: convert cardio + dynamicStretching to exercise list
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

  // Normalize cooldown: old format has coolDown.staticStretching
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

export default function WorkoutPlanPage() {
  const t = useTranslations("workouts");
  const tCommon = useTranslations("common");
  const tEmpty = useTranslations("emptyStates");
  const locale = useLocale();
  const { workoutPlan, isLoading, error } = useCurrentWorkoutPlan();
  const assessment = useQuery(api.assessments.getMyAssessment);
  const [now] = useState(() => Date.now());
  const [selectedDay, setSelectedDay] = useState(0);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(0);
  const daySelectorRef = useRef<HTMLDivElement>(null);
  const isRTL = locale === "ar";

  // Scroll day selector to show day 1 on the correct edge for RTL
  useEffect(() => {
    const el = daySelectorRef.current;
    if (!el) return;
    if (isRTL) {
      // In RTL, scroll to the end so day 1 appears on the right edge
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    }
  }, [isRTL]);

  // Scroll selected day into view
  useEffect(() => {
    const el = daySelectorRef.current;
    if (!el) return;
    const activeBtn = el.querySelector("[data-active='true']");
    if (activeBtn) {
      activeBtn.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
    }
  }, [selectedDay]);

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

  // Auto-select today (setState during render, guarded by selectedDay === 0)
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
      : 14;

  // Detect rest days for DaySelector
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- compiler infers subset; all 3 deps are needed
  const restDays = useMemo(() => {
    if (!workoutPlan?.planData) return [];
    const planData = workoutPlan.planData as unknown as GeneratedWorkoutPlan;
    const days: number[] = [];
    for (let i = 0; i < totalDays; i++) {
      const raw = resolveDayPlan(planData.weeklyPlan, i, workoutPlan.startDate);
      if (raw?.restDay) {
        days.push(i);
      }
    }
    return days;
  }, [workoutPlan?.planData, totalDays, workoutPlan?.startDate]);

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
        <div className="rounded-xl border border-[#F97316]/30 bg-[#F97316]/5 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 animate-pulse text-[#F97316]" />
            <span className="text-sm font-semibold text-[#F97316]">{t("aiGenerating")}</span>
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

  const planData = workoutPlan.planData as unknown as GeneratedWorkoutPlan & {
    splitType?: string;
    splitName?: string;
    splitDescription?: string;
  };
  const rawDayPlan = resolveDayPlan(planData.weeklyPlan, selectedDay, workoutPlan.startDate);
  const dayPlan = normalizeWorkoutDay(rawDayPlan);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {new Date(workoutPlan.startDate).toLocaleDateString(locale === "ar" ? "ar-EG" : "en")} -{" "}
          {new Date(workoutPlan.endDate).toLocaleDateString(locale === "ar" ? "ar-EG" : "en")}
        </p>
      </div>

      {/* Training Split Overview Card */}
      {planData.splitName && (
        <div className="rounded-xl border border-[#F97316]/20 bg-gradient-to-r from-[#F97316]/5 to-[#F97316]/10 p-4">
          <div className="mb-1.5 flex items-center gap-2">
            <Target className="h-4 w-4 text-[#F97316]" />
            <span className="text-sm font-bold text-[#F97316]">{t("trainingSplit")}</span>
          </div>
          <h3 className="text-lg font-bold">{planData.splitName}</h3>
          {planData.splitDescription && (
            <p className="text-muted-foreground mt-1 text-xs">{planData.splitDescription}</p>
          )}
        </div>
      )}

      {/* Day Selector (1-14) (WORK-01) */}
      <DaySelector
        totalDays={totalDays}
        selectedDay={selectedDay}
        onSelectDay={(day) => {
          setSelectedDay(day);
          setExpandedExercise(0);
        }}
        planStartDate={workoutPlan.startDate}
        restDays={restDays}
        featureColor="fitness"
      />

      {/* Today's Workout */}
      {dayPlan && (
        <>
          {dayPlan.restDay ? (
            <div className="border-border bg-card shadow-card animate-slide-up rounded-xl border p-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                <Zap className="text-muted-foreground h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold">{t("restDay")}</h3>
              <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm">
                {t("restDescription")}
              </p>
            </div>
          ) : (
            <>
              {/* Daily Workout Summary Card (WORK-05) */}
              <WidgetCard featureColor="fitness" title={dayPlan.workoutName || t("todaysWorkout")}>
                <div className="flex items-center">
                  <div className="flex-1 text-center">
                    <p className="text-lg font-bold">
                      {Array.isArray(dayPlan.targetMuscles)
                        ? dayPlan.targetMuscles.join(", ")
                        : "-"}
                    </p>
                    <p className="text-muted-foreground text-[10px]">{t("targetMuscles")}</p>
                  </div>
                  <div className="bg-border h-8 w-px" />
                  <div className="flex-1 text-center">
                    <p className="text-lg font-bold">{dayPlan.exercises?.length || 0}</p>
                    <p className="text-muted-foreground text-[10px]">{t("exercises")}</p>
                  </div>
                  <div className="bg-border h-8 w-px" />
                  <div className="flex-1 text-center">
                    <p className="text-lg font-bold">{dayPlan.duration || "-"}</p>
                    <p className="text-muted-foreground text-[10px]">{t("duration")}</p>
                  </div>
                </div>
              </WidgetCard>

              {/* Warmup */}
              {dayPlan.warmup &&
                Array.isArray(dayPlan.warmup.exercises) &&
                dayPlan.warmup.exercises.length > 0 && (
                  <div className="border-border bg-card shadow-card animate-slide-up overflow-hidden rounded-xl border">
                    <div className="border-border flex items-center gap-2 border-b bg-[#F97316]/8 p-4">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#F97316]/12 text-xs font-bold text-[#F97316]">
                        W
                      </span>
                      <h3 className="text-sm font-semibold">{t("warmup")}</h3>
                    </div>
                    <div className="divide-border divide-y">
                      {dayPlan.warmup.exercises.map((exercise, index) => (
                        <div key={index} className="p-4">
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-sm font-medium">{exercise.name}</span>
                            <span className="text-muted-foreground rounded-md bg-neutral-100 px-2 py-0.5 text-xs">
                              {exercise.duration}s
                            </span>
                          </div>
                          <ul className="text-muted-foreground space-y-0.5 text-xs">
                            {(Array.isArray(exercise.instructions)
                              ? exercise.instructions
                              : []
                            ).map((instruction: string, i: number) => (
                              <li key={i}>&#8226; {instruction}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Exercise Mini-Cards (WORK-02, WORK-03, WORK-04) */}
              <div className="space-y-3">
                {(dayPlan.exercises ?? []).map((exercise, index) => {
                  const isExpanded = expandedExercise === index;

                  return (
                    <div
                      key={index}
                      className="border-border bg-card shadow-card animate-slide-up overflow-hidden rounded-xl border"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Exercise Header */}
                      <button
                        onClick={() => setExpandedExercise(isExpanded ? null : index)}
                        className="flex w-full items-center justify-between gap-3 p-3.5 text-start transition-colors hover:bg-neutral-50 active:scale-[0.97]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F97316]/10 text-xs font-bold text-[#F97316]">
                            {String(index + 1).padStart(2, "0")}
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-semibold">{exercise.name}</h4>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {exercise.sets}x{exercise.reps} {t("reps")}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {/* Muscle group tags (WORK-03) */}
                          {exercise.targetMuscles && exercise.targetMuscles.length > 0 && (
                            <span className="hidden rounded-full bg-[#F97316]/10 px-2 py-0.5 text-[10px] font-medium text-[#F97316] sm:inline-block">
                              {exercise.targetMuscles.join(", ")}
                            </span>
                          )}
                          <ChevronDown
                            className={cn(
                              "text-muted-foreground h-4 w-4 transition-transform duration-200",
                              isExpanded && "rotate-180",
                            )}
                          />
                        </div>
                      </button>

                      {/* Expanded Content (WORK-04) */}
                      <div
                        className={cn(
                          "overflow-hidden transition-all duration-200 ease-in-out",
                          isExpanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0",
                        )}
                      >
                        <div className="border-border space-y-3 border-t px-3.5 pt-3 pb-3.5">
                          {/* Muscle tags (visible on mobile when expanded) */}
                          {exercise.targetMuscles && exercise.targetMuscles.length > 0 && (
                            <div className="flex flex-wrap gap-1 sm:hidden">
                              {exercise.targetMuscles.map((muscle: string, mi: number) => (
                                <span
                                  key={mi}
                                  className="rounded-full bg-[#F97316]/10 px-2 py-0.5 text-[10px] font-medium text-[#F97316]"
                                >
                                  {muscle}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Sets / Reps / Rest grid */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-lg bg-neutral-50 p-2 text-center">
                              <p className="text-sm font-bold">{exercise.sets}</p>
                              <p className="text-muted-foreground text-[10px]">{t("sets")}</p>
                            </div>
                            <div className="rounded-lg bg-neutral-50 p-2 text-center">
                              <p className="text-sm font-bold">{exercise.reps}</p>
                              <p className="text-muted-foreground text-[10px]">{t("reps")}</p>
                            </div>
                            <div className="rounded-lg bg-neutral-50 p-2 text-center">
                              <p className="text-sm font-bold">{exercise.rest || "-"}</p>
                              <p className="text-muted-foreground text-[10px]">{t("rest")}</p>
                            </div>
                          </div>

                          {/* Equipment */}
                          {exercise.equipment && (
                            <span className="inline-block rounded-md bg-[#F97316]/12 px-2.5 py-1 text-xs font-medium text-[#F97316]">
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

              {/* Cooldown */}
              {dayPlan.cooldown &&
                Array.isArray(dayPlan.cooldown.exercises) &&
                dayPlan.cooldown.exercises.length > 0 && (
                  <div className="border-border bg-card shadow-card animate-slide-up overflow-hidden rounded-xl border">
                    <div className="border-border flex items-center gap-2 border-b bg-neutral-50 p-4">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-200 text-xs font-bold">
                        C
                      </span>
                      <h3 className="text-sm font-semibold">{t("cooldown")}</h3>
                    </div>
                    <div className="divide-border divide-y">
                      {dayPlan.cooldown.exercises.map((exercise, index) => (
                        <div key={index} className="p-4">
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-sm font-medium">{exercise.name}</span>
                            <span className="text-muted-foreground rounded-md bg-neutral-100 px-2 py-0.5 text-xs">
                              {exercise.duration}s
                            </span>
                          </div>
                          <ul className="text-muted-foreground space-y-0.5 text-xs">
                            {(Array.isArray(exercise.instructions)
                              ? exercise.instructions
                              : []
                            ).map((instruction: string, i: number) => (
                              <li key={i}>&#8226; {instruction}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </>
          )}
        </>
      )}

      {/* Progression Notes */}
      {planData.progressionNotes && (
        <div className="rounded-xl border border-[#F97316]/20 bg-[#F97316]/8 p-4">
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
