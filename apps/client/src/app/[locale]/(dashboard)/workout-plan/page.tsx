"use client";

import { useTranslations, useLocale } from "next-intl";
import { useCurrentWorkoutPlan } from "@/hooks/use-workout-plans";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Dumbbell, Calendar, Clock, RefreshCw, Zap, Target, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@fitfast/ui/cn";
import { usePlanStream } from "@/hooks/use-plan-stream";
import type { GeneratedWorkoutPlan } from "@/lib/ai/workout-plan-generator";

export default function WorkoutPlanPage() {
  const t = useTranslations("workouts");
  const tCommon = useTranslations("common");
  const tDays = useTranslations("days");
  const locale = useLocale();
  const { profile } = useAuth();
  const { workoutPlan, isLoading, error } = useCurrentWorkoutPlan();
  const [selectedDay, setSelectedDay] = useState("monday");
  const [generatingPlan, setGeneratingPlan] = useState(false);

  const generateWorkoutPlan = useAction(api.ai.generateWorkoutPlan);

  // Streaming support
  const streamId = workoutPlan?.streamId;
  const { streamedText, isStreaming } = usePlanStream(
    workoutPlan && (!workoutPlan.planData || (workoutPlan.planData as any)?.parseError)
      ? streamId
      : undefined,
  );

  const weekDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

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
        <div className="rounded-xl border border-border bg-card p-10 text-center shadow-card">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-[#F97316]/12 mb-4">
            <Dumbbell className="h-8 w-8 text-[#F97316]" />
          </div>
          <h3 className="text-lg font-semibold">{t("noActivePlan")}</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            {t("generateDescription")}
          </p>
          <button
            onClick={handleGeneratePlan}
            disabled={generatingPlan}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-[0.97]"
          >
            {generatingPlan ? (
              <><RefreshCw className="h-4 w-4 animate-spin" />{t("generating")}</>
            ) : (
              <><Dumbbell className="h-4 w-4" />{t("generatePlan")}</>
            )}
          </button>
        </div>
      </div>
    );
  }

  const planData = workoutPlan.planData as unknown as GeneratedWorkoutPlan;
  const dayPlan = planData.weeklyPlan[selectedDay];

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

      {/* Day Selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {weekDays.map((day) => {
          const isPlanRestDay = planData.weeklyPlan[day]?.restDay;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={cn(
                "flex-shrink-0 min-w-[56px] px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-center",
                selectedDay === day
                  ? "bg-[#F97316] text-white"
                  : isPlanRestDay
                  ? "bg-neutral-100 text-neutral-400"
                  : "bg-neutral-100 text-muted-foreground hover:bg-neutral-200"
              )}
            >
              <div>{locale === "ar" ? tDays(day as any) : tDays((day.slice(0, 3)) as any)}</div>
              {isPlanRestDay && (
                <div className="text-[10px] mt-0.5 opacity-70">{t("rest")}</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Today's Workout */}
      {dayPlan && (
        <>
          {dayPlan.restDay ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center shadow-card">
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
              {/* Workout Overview */}
              <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                <div className="p-4 border-b border-border bg-[#F97316]/8">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F97316]/12">
                        <Target className="h-4 w-4 text-[#F97316]" />
                      </div>
                      <div>
                        <h2 className="font-semibold">
                          {dayPlan.workoutName || t("todaysWorkout")}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {t("targetMuscles")}: {dayPlan.targetMuscles?.join(", ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {dayPlan.duration} {t("duration")}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <button className="w-full py-3 rounded-lg bg-gradient-to-r from-[#F97316] to-[#FB923C] text-white font-semibold text-sm hover:opacity-90 transition-all active:scale-[0.97] flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(249,115,22,0.3)]">
                    <Zap className="h-4 w-4" />
                    {t("startWorkout")}
                  </button>
                </div>
              </div>

              {/* Warmup */}
              {dayPlan.warmup && (
                <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
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
                            <li key={i}>• {instruction}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exercises */}
              <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                <div className="flex items-center gap-2 p-4 border-b border-border">
                  <Dumbbell className="h-4 w-4 text-[#F97316]" />
                  <h3 className="font-semibold text-sm">{t("exercises")}</h3>
                </div>
                <div className="divide-y divide-border">
                  {dayPlan.exercises.map((exercise, index) => (
                    <div key={index} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs font-bold">
                            {String(index + 1).padStart(2, "0")}
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">{exercise.name}</h4>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <span className="rounded-md bg-[#F97316]/12 text-[#F97316] px-2 py-0.5 text-xs font-medium">
                                {exercise.sets} {t("sets")}
                              </span>
                              <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium">
                                {exercise.reps} {t("reps")}
                              </span>
                              <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium">
                                {t("rest")}: {exercise.rest}s
                              </span>
                              {exercise.equipment && (
                                <span className="rounded-md bg-[#F97316]/12 text-[#F97316] px-2 py-0.5 text-xs font-medium">
                                  {exercise.equipment}
                                </span>
                              )}
                            </div>
                            {exercise.notes && (
                              <p className="mt-2 text-xs text-muted-foreground italic">
                                {exercise.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cooldown */}
              {dayPlan.cooldown && (
                <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
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
                            <li key={i}>• {instruction}</li>
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
