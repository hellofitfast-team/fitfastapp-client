"use client";

import { useTranslations, useLocale } from "next-intl";
import { useCurrentWorkoutPlan } from "@/hooks/use-workout-plans";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Dumbbell, Calendar, Clock, RefreshCw, Zap, Target, Loader2, AlertTriangle, Sparkles, ChevronDown } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@fitfast/ui/cn";
import { usePlanStream } from "@/hooks/use-plan-stream";
import { EmptyState } from "@fitfast/ui/empty-state";
import { WidgetCard } from "@fitfast/ui/widget-card";
import { DaySelector } from "../meal-plan/_components/day-selector";
import type { GeneratedWorkoutPlan } from "@/lib/ai/workout-plan-generator";

export default function WorkoutPlanPage() {
  const t = useTranslations("workouts");
  const tCommon = useTranslations("common");
  const tEmpty = useTranslations("emptyStates");
  const locale = useLocale();
  const { profile } = useAuth();
  const { workoutPlan, isLoading, error } = useCurrentWorkoutPlan();
  const [selectedDay, setSelectedDay] = useState(0);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(0);

  const generateWorkoutPlan = useAction(api.ai.generateWorkoutPlan);

  // Streaming support
  const streamId = workoutPlan?.streamId;
  const { streamedText, isStreaming } = usePlanStream(
    workoutPlan && (!workoutPlan.planData || (workoutPlan.planData as any)?.parseError)
      ? streamId
      : undefined,
  );

  const weekDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  // Map day index (0-13) to weekday name (days 8-14 repeat days 1-7)
  const getDayName = (dayIndex: number): string => {
    return weekDays[dayIndex % 7];
  };

  // Compute today's day index from plan start date
  const todayDayIndex = useMemo(() => {
    if (!workoutPlan?.startDate) return 0;
    const start = new Date(workoutPlan.startDate);
    const diff = Math.floor((Date.now() - start.getTime()) / 86400000);
    return Math.max(0, Math.min(13, diff));
  }, [workoutPlan?.startDate]);

  // Auto-select today on mount
  useState(() => {
    if (workoutPlan?.startDate) {
      setSelectedDay(todayDayIndex);
    }
  });

  // Detect rest days for DaySelector
  const restDays = useMemo(() => {
    if (!workoutPlan?.planData) return [];
    const planData = workoutPlan.planData as unknown as GeneratedWorkoutPlan;
    const days: number[] = [];
    for (let i = 0; i < 14; i++) {
      const dayName = getDayName(i);
      if (planData.weeklyPlan[dayName]?.restDay) {
        days.push(i);
      }
    }
    return days;
  }, [workoutPlan?.planData]);

  const handleGeneratePlan = async () => {
    setGeneratingPlan(true);
    try {
      await generateWorkoutPlan({
        language: (profile?.language || "en") as "en" | "ar",
        planDuration: 14,
      });
      window.location.reload();
    } catch (err) {
      console.error("Error generating workout plan:", err);
      alert("Failed to generate workout plan. Please try again.");
    } finally {
      setGeneratingPlan(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  // Show streaming banner while AI generates the plan
  if (workoutPlan && isStreaming && streamedText) {
    return (
      <div className="px-4 py-6 space-y-5 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("generating")}</p>
        </div>
        <div className="rounded-xl border border-[#F97316]/30 bg-[#F97316]/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-[#F97316] animate-pulse" />
            <span className="text-sm font-semibold text-[#F97316]">
              {t("aiGenerating")}
            </span>
          </div>
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed max-h-96 overflow-y-auto">
            {streamedText}
          </pre>
        </div>
      </div>
    );
  }

  if (error || !workoutPlan) {
    return (
      <div className="px-4 py-6 space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("getStarted")}</p>
        </div>
        <EmptyState
          icon={Dumbbell}
          title={tEmpty("noWorkoutPlan.title")}
          description={tEmpty("noWorkoutPlan.description")}
          action={{
            label: tEmpty("noWorkoutPlan.action"),
            onClick: handleGeneratePlan,
          }}
        />
      </div>
    );
  }

  const planData = workoutPlan.planData as unknown as GeneratedWorkoutPlan;
  const dayName = getDayName(selectedDay);
  const dayPlan = planData.weeklyPlan[dayName];

  return (
    <div className="px-4 py-6 space-y-5 max-w-3xl mx-auto lg:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {workoutPlan.startDate} - {workoutPlan.endDate}
          </p>
        </div>
        <button
          onClick={handleGeneratePlan}
          disabled={generatingPlan}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 transition-all active:scale-[0.97]"
        >
          <Calendar className="h-4 w-4" />
          {generatingPlan ? t("generating") : t("newPlan")}
        </button>
      </div>

      {/* Day Selector (1-14) (WORK-01) */}
      <DaySelector
        totalDays={14}
        selectedDay={selectedDay}
        onSelectDay={(day) => { setSelectedDay(day); setExpandedExercise(0); }}
        planStartDate={workoutPlan.startDate}
        restDays={restDays}
        featureColor="fitness"
      />

      {/* Today's Workout */}
      {dayPlan && (
        <>
          {dayPlan.restDay ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center shadow-card animate-slide-up">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-neutral-100 mb-4">
                <Zap className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">{t("restDay")}</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                {t("restDescription")}
              </p>
            </div>
          ) : (
            <>
              {/* Daily Workout Summary Card (WORK-05) */}
              <WidgetCard featureColor="fitness" title={dayPlan.workoutName || t("todaysWorkout")}>
                <div className="flex items-center">
                  <div className="text-center flex-1">
                    <p className="text-lg font-bold">{dayPlan.targetMuscles?.join(", ") || "-"}</p>
                    <p className="text-[10px] text-muted-foreground">{t("targetMuscles")}</p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="text-center flex-1">
                    <p className="text-lg font-bold">{dayPlan.exercises?.length || 0}</p>
                    <p className="text-[10px] text-muted-foreground">{t("exercises")}</p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="text-center flex-1">
                    <p className="text-lg font-bold">{dayPlan.duration || "-"}</p>
                    <p className="text-[10px] text-muted-foreground">{t("duration")}</p>
                  </div>
                </div>
              </WidgetCard>

              {/* Warmup */}
              {dayPlan.warmup && (
                <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden animate-slide-up">
                  <div className="flex items-center gap-2 p-4 border-b border-border bg-[#F97316]/8">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#F97316]/12 text-[#F97316] text-xs font-bold">W</span>
                    <h3 className="font-semibold text-sm">{t("warmup")}</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {dayPlan.warmup.exercises.map((exercise, index) => (
                      <div key={index} className="p-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-medium text-sm">{exercise.name}</span>
                          <span className="text-xs text-muted-foreground rounded-md bg-neutral-100 px-2 py-0.5">
                            {exercise.duration}s
                          </span>
                        </div>
                        <ul className="space-y-0.5 text-xs text-muted-foreground">
                          {exercise.instructions.map((instruction, i) => (
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
                {dayPlan.exercises.map((exercise, index) => {
                  const isExpanded = expandedExercise === index;

                  return (
                    <div
                      key={index}
                      className="rounded-xl border border-border bg-card shadow-card overflow-hidden animate-slide-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Exercise Header */}
                      <button
                        onClick={() => setExpandedExercise(isExpanded ? null : index)}
                        className="w-full p-3.5 flex items-center justify-between gap-3 text-start hover:bg-neutral-50 transition-colors active:scale-[0.97]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F97316]/10 text-[#F97316] text-xs font-bold">
                            {String(index + 1).padStart(2, "0")}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm truncate">{exercise.name}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {exercise.sets}x{exercise.reps} {t("reps")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Muscle group tags (WORK-03) */}
                          {exercise.targetMuscles && exercise.targetMuscles.length > 0 && (
                            <span className="rounded-full bg-[#F97316]/10 text-[#F97316] px-2 py-0.5 text-[10px] font-medium hidden sm:inline-block">
                              {exercise.targetMuscles.join(", ")}
                            </span>
                          )}
                          <ChevronDown className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform duration-200",
                            isExpanded && "rotate-180"
                          )} />
                        </div>
                      </button>

                      {/* Expanded Content (WORK-04) */}
                      <div className={cn(
                        "overflow-hidden transition-all duration-200 ease-in-out",
                        isExpanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
                      )}>
                        <div className="px-3.5 pb-3.5 space-y-3 border-t border-border pt-3">
                          {/* Muscle tags (visible on mobile when expanded) */}
                          {exercise.targetMuscles && exercise.targetMuscles.length > 0 && (
                            <div className="flex flex-wrap gap-1 sm:hidden">
                              {exercise.targetMuscles.map((muscle, mi) => (
                                <span key={mi} className="rounded-full bg-[#F97316]/10 text-[#F97316] px-2 py-0.5 text-[10px] font-medium">
                                  {muscle}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Sets / Reps / Rest grid */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-lg bg-neutral-50 p-2 text-center">
                              <p className="text-sm font-bold">{exercise.sets}</p>
                              <p className="text-[10px] text-muted-foreground">{t("sets")}</p>
                            </div>
                            <div className="rounded-lg bg-neutral-50 p-2 text-center">
                              <p className="text-sm font-bold">{exercise.reps}</p>
                              <p className="text-[10px] text-muted-foreground">{t("reps")}</p>
                            </div>
                            <div className="rounded-lg bg-neutral-50 p-2 text-center">
                              <p className="text-sm font-bold">{exercise.rest}s</p>
                              <p className="text-[10px] text-muted-foreground">{t("rest")}</p>
                            </div>
                          </div>

                          {/* Equipment */}
                          {exercise.equipment && (
                            <span className="inline-block rounded-md bg-[#F97316]/12 text-[#F97316] px-2.5 py-1 text-xs font-medium">
                              {exercise.equipment}
                            </span>
                          )}

                          {/* Notes */}
                          {exercise.notes && (
                            <p className="text-xs text-muted-foreground italic bg-neutral-50 rounded-lg p-2.5">
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
              {dayPlan.cooldown && (
                <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden animate-slide-up">
                  <div className="flex items-center gap-2 p-4 border-b border-border bg-neutral-50">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-200 text-xs font-bold">C</span>
                    <h3 className="font-semibold text-sm">{t("cooldown")}</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {dayPlan.cooldown.exercises.map((exercise, index) => (
                      <div key={index} className="p-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-medium text-sm">{exercise.name}</span>
                          <span className="text-xs text-muted-foreground rounded-md bg-neutral-100 px-2 py-0.5">
                            {exercise.duration}s
                          </span>
                        </div>
                        <ul className="space-y-0.5 text-xs text-muted-foreground">
                          {exercise.instructions.map((instruction, i) => (
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
        <div className="rounded-xl bg-[#F97316]/8 border border-[#F97316]/20 p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1">{t("progressionNotes")}</p>
          <p className="text-sm font-medium">{planData.progressionNotes}</p>
        </div>
      )}

      {/* Safety Tips */}
      {planData.safetyTips && planData.safetyTips.length > 0 && (
        <div className="rounded-xl bg-error-500/5 border border-error-500/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-error-500" />
            <p className="text-xs font-semibold text-error-500">{t("safetyTips")}</p>
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
