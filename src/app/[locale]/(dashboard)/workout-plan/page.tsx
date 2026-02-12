"use client";

import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentWorkoutPlan } from "@/hooks/use-workout-plans";
import { Dumbbell, Calendar, Clock, CheckCircle2, RefreshCw, Info, Zap, Target } from "lucide-react";
import { useState } from "react";
import type { GeneratedWorkoutPlan } from "@/lib/ai/workout-plan-generator";

export default function WorkoutPlanPage() {
  const t = useTranslations("workouts");
  const tCommon = useTranslations("common");
  const tDays = useTranslations("days");
  const locale = useLocale();
  const { user } = useAuth();
  const { workoutPlan, isLoading, error } = useCurrentWorkoutPlan(user?.id);
  const [selectedDay, setSelectedDay] = useState("monday");
  const [generatingPlan, setGeneratingPlan] = useState(false);

  const weekDays = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  const handleGeneratePlan = async () => {
    setGeneratingPlan(true);
    try {
      const response = await fetch("/api/plans/workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planDuration: 14 }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate workout plan");
      }

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
      <div className="flex items-center justify-center py-12">
        <div className="border-4 border-black bg-cream p-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="mx-auto w-12 h-12 border-4 border-black border-t-primary animate-spin mb-4" />
          <p className="font-black uppercase">{tCommon("loading").toUpperCase()}</p>
        </div>
      </div>
    );
  }

  if (error || !workoutPlan) {
    return (
      <div className="space-y-6">
        <div className="border-4 border-black bg-black p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center bg-primary">
              <Dumbbell className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-cream">
                {t("title").toUpperCase()}
              </h1>
              <p className="font-bold text-sm tracking-[0.2em] text-primary">
                {t("getStarted").toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="p-12 text-center">
            <div className="inline-flex h-20 w-20 items-center justify-center bg-primary mb-6">
              <Dumbbell className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-black tracking-tight">
              {t("noActivePlan").toUpperCase()}
            </h3>
            <p className="mt-3 font-bold text-sm text-neutral-500 max-w-md mx-auto">
              {t("generateDescription").toUpperCase()}
            </p>
            <button
              onClick={handleGeneratePlan}
              disabled={generatingPlan}
              className="mt-8 h-14 px-8 bg-black text-cream hover:bg-primary hover:text-white font-black text-lg uppercase tracking-wide disabled:opacity-50 transition-colors flex items-center gap-3 mx-auto"
            >
              {generatingPlan ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  {t("generating").toUpperCase()}
                </>
              ) : (
                <>
                  <Dumbbell className="h-5 w-5" />
                  {t("generatePlan").toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const planData = workoutPlan.plan_data as unknown as GeneratedWorkoutPlan;
  const dayPlan = planData.weeklyPlan[selectedDay];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-4 border-black bg-black p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center bg-primary">
              <Dumbbell className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-cream">
                {t("title").toUpperCase()}
              </h1>
              <p className="font-bold text-sm text-primary">
                {workoutPlan.start_date} - {workoutPlan.end_date}
              </p>
            </div>
          </div>
          <button
            onClick={handleGeneratePlan}
            disabled={generatingPlan}
            className="h-12 px-6 bg-cream text-black hover:bg-primary hover:text-cream font-black text-sm uppercase tracking-wide disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            {generatingPlan ? t("generating").toUpperCase() : t("newPlan").toUpperCase()}
          </button>
        </div>
      </div>

      {/* Day Selector */}
      <div className="flex gap-0 overflow-x-auto pb-2">
        {weekDays.map((day) => {
          const isPlanRestDay = planData.weeklyPlan[day]?.restDay;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 min-w-[80px] p-3 border-4 border-black -ms-1 first:ms-0 font-black text-sm transition-colors ${
                selectedDay === day
                  ? "bg-black text-primary z-10"
                  : isPlanRestDay
                  ? "bg-neutral-200 text-neutral-500"
                  : "bg-cream text-black hover:bg-neutral-100"
              }`}
            >
              {/* Show short day name for English, full name for Arabic */}
              <div>{locale === "ar" ? tDays(day as any) : tDays((day.slice(0, 3)) as any)}</div>
              {isPlanRestDay && (
                <div className="text-sm font-bold mt-1 opacity-70">{t("rest").toUpperCase()}</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Today's Workout */}
      {dayPlan && (
        <>
          {dayPlan.restDay ? (
            <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="border-b-4 border-black bg-neutral-200 p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-black">
                  <Info className="h-5 w-5 text-cream" />
                </div>
                <h2 className="font-black text-xl text-black tracking-tight">
                  {t("restDay").toUpperCase()}
                </h2>
              </div>
              <div className="p-12 text-center">
                <div className="inline-flex h-20 w-20 items-center justify-center bg-neutral-200 mb-6">
                  <Zap className="h-10 w-10 text-neutral-500" />
                </div>
                <h3 className="text-2xl font-black tracking-tight">
                  {t("timeToRecover").toUpperCase()}
                </h3>
                <p className="mt-3 font-bold text-sm text-neutral-500 max-w-md mx-auto">
                  {t("restDescription").toUpperCase()}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Workout Overview */}
              <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="border-b-4 border-black bg-primary p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center bg-black">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-black text-xl text-white tracking-tight">
                        {dayPlan.workoutName?.toUpperCase() || t("todaysWorkout").toUpperCase()}
                      </h2>
                      <p className="font-bold text-sm text-white/80">
                        {t("targetMuscles").toUpperCase()}: {dayPlan.targetMuscles?.join(", ").toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-white font-mono text-sm">
                      <Clock className="h-4 w-4" />
                      {dayPlan.duration} {t("duration").toUpperCase()}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <button
                    className="w-full h-14 bg-black text-cream hover:bg-primary hover:text-white font-black text-lg uppercase tracking-wide transition-colors flex items-center justify-center gap-3"
                  >
                    <Zap className="h-5 w-5" />
                    {t("startWorkout").toUpperCase()}
                  </button>
                </div>
              </div>

              {/* Warmup */}
              {dayPlan.warmup && (
                <div className="border-4 border-black bg-cream">
                  <div className="border-b-4 border-black bg-primary p-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center bg-black">
                      <span className="font-black text-primary">W</span>
                    </div>
                    <h3 className="font-black text-lg text-white tracking-tight">
                      {t("warmup").toUpperCase()}
                    </h3>
                  </div>
                  <div className="divide-y-4 divide-black">
                    {dayPlan.warmup.exercises.map((exercise, index) => (
                      <div key={index} className="p-4 hover:bg-neutral-50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-black">{exercise.name.toUpperCase()}</span>
                          <span className="font-mono text-xs bg-neutral-200 px-2 py-1 border-2 border-black">
                            {exercise.duration}S
                          </span>
                        </div>
                        <ul className="space-y-1 font-mono text-xs text-neutral-600">
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
              <div className="border-4 border-black bg-cream">
                <div className="border-b-4 border-black bg-black p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center bg-primary">
                    <Dumbbell className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-black text-lg text-cream tracking-tight">
                    {t("exercises").toUpperCase()}
                  </h3>
                </div>
                <div className="divide-y-4 divide-black">
                  {dayPlan.exercises.map((exercise, index) => (
                    <div key={index} className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-black text-cream font-black">
                            {String(index + 1).padStart(2, "0")}
                          </div>
                          <div>
                            <h4 className="font-black text-lg tracking-tight">
                              {exercise.name.toUpperCase()}
                            </h4>
                            <div className="flex flex-wrap gap-3 mt-2 font-mono text-xs">
                              <span className="px-2 py-1 border-2 border-black bg-primary/10 text-primary">
                                {exercise.sets} {t("sets").toUpperCase()}
                              </span>
                              <span className="px-2 py-1 border-2 border-black bg-neutral-100">
                                {exercise.reps} {t("reps").toUpperCase()}
                              </span>
                              <span className="px-2 py-1 border-2 border-black bg-neutral-100">
                                {t("rest").toUpperCase()}: {exercise.rest}S
                              </span>
                              {exercise.equipment && (
                                <span className="px-2 py-1 border-2 border-black bg-primary/10 uppercase">
                                  {exercise.equipment}
                                </span>
                              )}
                            </div>
                            {exercise.notes && (
                              <p className="mt-3 font-mono text-xs text-neutral-600 italic">
                                {exercise.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <button className="h-12 w-12 shrink-0 border-4 border-black bg-cream hover:bg-primary transition-colors flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cooldown */}
              {dayPlan.cooldown && (
                <div className="border-4 border-black bg-cream">
                  <div className="border-b-4 border-black bg-neutral-200 p-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center bg-black">
                      <span className="font-black text-cream">C</span>
                    </div>
                    <h3 className="font-black text-lg text-black tracking-tight">
                      {t("cooldown").toUpperCase()}
                    </h3>
                  </div>
                  <div className="divide-y-4 divide-black">
                    {dayPlan.cooldown.exercises.map((exercise, index) => (
                      <div key={index} className="p-4 hover:bg-neutral-50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-black">{exercise.name.toUpperCase()}</span>
                          <span className="font-mono text-xs bg-neutral-200 px-2 py-1 border-2 border-black">
                            {exercise.duration}S
                          </span>
                        </div>
                        <ul className="space-y-1 font-mono text-xs text-neutral-600">
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
        <div className="border-4 border-black bg-primary p-6">
          <p className="font-mono text-xs tracking-[0.2em] text-white/80 mb-2">{t("progressionNotes").toUpperCase()}</p>
          <p className="font-black text-white">{planData.progressionNotes}</p>
        </div>
      )}

      {/* Safety Tips */}
      {planData.safetyTips && planData.safetyTips.length > 0 && (
        <div className="border-4 border-black bg-error-500 p-6">
          <p className="font-mono text-xs tracking-[0.2em] text-white/70 mb-3">{t("safetyTips").toUpperCase()}</p>
          <ul className="space-y-2">
            {planData.safetyTips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2 text-white font-mono text-sm">
                <span className="font-black">!</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
