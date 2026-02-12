"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentMealPlan } from "@/hooks/use-meal-plans";
import { useCurrentWorkoutPlan } from "@/hooks/use-workout-plans";
import {
  useTracking,
  toggleMealCompletion,
  toggleWorkoutCompletion,
  saveDailyReflection,
} from "@/hooks/use-tracking";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
  Dumbbell,
  BookOpen,
  CheckCircle2,
  Circle,
  Loader2,
  Target,
} from "lucide-react";
import type { GeneratedMealPlan } from "@/lib/ai/meal-plan-generator";
import type { GeneratedWorkoutPlan } from "@/lib/ai/workout-plan-generator";

interface ReflectionForm {
  reflection: string;
}

export default function TrackingPage() {
  const t = useTranslations("tracking");
  const tCommon = useTranslations("common");
  const tMeals = useTranslations("meals");
  const tWorkouts = useTranslations("workouts");

  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isMealsExpanded, setIsMealsExpanded] = useState(true);
  const [isWorkoutsExpanded, setIsWorkoutsExpanded] = useState(true);
  const [mealNotes, setMealNotes] = useState<{ [key: number]: string }>({});
  const [workoutNotes, setWorkoutNotes] = useState<{ [key: number]: string }>({});
  const [isTogglingMeal, setIsTogglingMeal] = useState<number | null>(null);
  const [isTogglingWorkout, setIsTogglingWorkout] = useState<number | null>(null);

  const { mealPlan, isLoading: mealPlanLoading } = useCurrentMealPlan(user?.id);
  const { workoutPlan, isLoading: workoutPlanLoading } = useCurrentWorkoutPlan(user?.id);
  const { trackingData, isLoading: trackingLoading, refetch } = useTracking(user?.id, selectedDate);

  const { register, handleSubmit, reset, formState } = useForm<ReflectionForm>({
    defaultValues: {
      reflection: trackingData.dailyReflection?.reflection || "",
    },
  });

  useEffect(() => {
    if (trackingData.dailyReflection) {
      reset({ reflection: trackingData.dailyReflection.reflection || "" });
    } else {
      reset({ reflection: "" });
    }
  }, [trackingData.dailyReflection, reset]);

  const getDayName = (date: string): string => {
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return dayNames[new Date(date).getDay()];
  };

  const handleMealToggle = async (mealIndex: number, currentlyCompleted: boolean) => {
    if (!user?.id || !mealPlan?.id) return;
    setIsTogglingMeal(mealIndex);
    try {
      await toggleMealCompletion(user.id, mealPlan.id, selectedDate, mealIndex, !currentlyCompleted, mealNotes[mealIndex]);
      await refetch();
    } catch (error) {
      console.error("Failed to toggle meal completion:", error);
    } finally {
      setIsTogglingMeal(null);
    }
  };

  const handleWorkoutToggle = async (workoutIndex: number, currentlyCompleted: boolean) => {
    if (!user?.id || !workoutPlan?.id) return;
    setIsTogglingWorkout(workoutIndex);
    try {
      await toggleWorkoutCompletion(user.id, workoutPlan.id, selectedDate, workoutIndex, !currentlyCompleted, workoutNotes[workoutIndex]);
      await refetch();
    } catch (error) {
      console.error("Failed to toggle workout completion:", error);
    } finally {
      setIsTogglingWorkout(null);
    }
  };

  const onReflectionSubmit = async (data: ReflectionForm) => {
    if (!user?.id) return;
    try {
      await saveDailyReflection(user.id, selectedDate, data.reflection);
      await refetch();
    } catch (error) {
      console.error("Failed to save reflection:", error);
    }
  };

  const getMealCompletion = (mealIndex: number) => {
    return trackingData.mealCompletions.find((c) => c.meal_index === mealIndex);
  };

  const getWorkoutCompletion = (workoutIndex: number) => {
    return trackingData.workoutCompletions.find((c) => c.workout_index === workoutIndex);
  };

  const calculateCompletionPercentage = (): number => {
    const dayName = getDayName(selectedDate);
    const mealPlanData = mealPlan?.plan_data as unknown as GeneratedMealPlan;
    const workoutPlanData = workoutPlan?.plan_data as unknown as GeneratedWorkoutPlan;

    let totalItems = 0;
    let completedItems = 0;

    if (mealPlanData?.weeklyPlan?.[dayName]) {
      const meals = mealPlanData.weeklyPlan[dayName].meals;
      totalItems += meals.length;
      completedItems += trackingData.mealCompletions.filter((c) => c.completed).length;
    }

    if (workoutPlanData?.weeklyPlan?.[dayName]) {
      const workout = workoutPlanData.weeklyPlan[dayName];
      if (!workout.restDay) {
        totalItems += 1;
        completedItems += trackingData.workoutCompletions.filter((c) => c.completed).length;
      }
    }

    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  const completionPercentage = calculateCompletionPercentage();
  const dayName = getDayName(selectedDate);
  const mealPlanData = mealPlan?.plan_data as unknown as GeneratedMealPlan;
  const workoutPlanData = workoutPlan?.plan_data as unknown as GeneratedWorkoutPlan;
  const todaysMeals = mealPlanData?.weeklyPlan?.[dayName]?.meals || [];
  const todaysWorkout = workoutPlanData?.weeklyPlan?.[dayName];

  if (mealPlanLoading || workoutPlanLoading || trackingLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-4 border-black bg-cream p-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 font-black uppercase">{tCommon("loading").toUpperCase()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-4 border-black bg-black p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center bg-primary">
            <Target className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-cream tracking-tight">
              {t("title").toUpperCase()}
            </h1>
            <p className="font-mono text-xs tracking-[0.2em] text-primary">
              {t("subtitle").toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Date Picker & Progress */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Date Picker */}
        <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="border-b-4 border-black bg-neutral-100 p-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="font-bold text-xs uppercase">{t("selectDate").toUpperCase()}</span>
          </div>
          <div className="p-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full h-12 px-4 border-4 border-black bg-cream font-mono text-sm focus:outline-none focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Completion Progress */}
        <div className="border-4 border-black bg-primary shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="p-6 flex items-center justify-between">
            <div>
              <p className="font-mono text-xs tracking-[0.2em] text-white/80">{t("todaysProgress").toUpperCase()}</p>
              <p className="text-5xl font-black text-white mt-2">{completionPercentage}%</p>
            </div>
            <div className="relative h-24 w-24">
              <svg className="h-24 w-24 -rotate-90 transform">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="black"
                  strokeWidth="8"
                  fill="transparent"
                  className="opacity-30"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="white"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - completionPercentage / 100)}`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Meal Tracking */}
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <button
          onClick={() => setIsMealsExpanded(!isMealsExpanded)}
          className="w-full border-b-4 border-black bg-primary p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center bg-black">
              <UtensilsCrossed className="h-6 w-6 text-primary" />
            </div>
            <div className="text-start">
              <h2 className="font-black text-xl text-white tracking-tight">
                {t("mealTracking").toUpperCase()}
              </h2>
              <p className="font-bold text-sm text-white/80">
                {trackingData.mealCompletions.filter((c) => c.completed).length} {t("of").toUpperCase()} {todaysMeals.length} {t("mealsCompleted").toUpperCase()}
              </p>
            </div>
          </div>
          <div className="h-10 w-10 flex items-center justify-center bg-black text-white">
            {isMealsExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </button>

        {isMealsExpanded && (
          <div className="divide-y-4 divide-black">
            {todaysMeals.length === 0 ? (
              <div className="p-12 text-center">
                <UtensilsCrossed className="mx-auto h-12 w-12 text-neutral-300" />
                <p className="mt-4 font-black">{t("noMealsPlanned").toUpperCase()}</p>
              </div>
            ) : (
              todaysMeals.map((meal, index) => {
                const completion = getMealCompletion(index);
                const isCompleted = completion?.completed || false;

                return (
                  <div key={index} className="p-5 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => handleMealToggle(index, isCompleted)}
                        disabled={isTogglingMeal === index}
                        className={`h-12 w-12 shrink-0 border-4 border-black flex items-center justify-center transition-colors ${
                          isCompleted ? "bg-success-500" : "bg-cream hover:bg-neutral-100"
                        }`}
                      >
                        {isTogglingMeal === index ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : isCompleted ? (
                          <CheckCircle2 className="h-6 w-6 text-black" />
                        ) : (
                          <Circle className="h-6 w-6 text-neutral-400" />
                        )}
                      </button>

                      <div className="flex-1 space-y-3">
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className={`font-black text-lg tracking-tight ${isCompleted ? "line-through text-neutral-400" : ""}`}>
                              {meal.name.toUpperCase()}
                            </h4>
                            <span className="font-mono text-xs text-neutral-500">{meal.time}</span>
                          </div>
                          <p className="font-bold text-sm text-neutral-500 mt-1">
                            {meal.calories} {tMeals("calories").toUpperCase()} • {meal.protein}g {tMeals("protein").toUpperCase()} • {meal.carbs}g {tMeals("carbs").toUpperCase()} • {meal.fat}g {tMeals("fat").toUpperCase()}
                          </p>
                        </div>

                        <textarea
                          placeholder={t("addNotes").toUpperCase()}
                          value={mealNotes[index] || completion?.notes || ""}
                          onChange={(e) => setMealNotes({ ...mealNotes, [index]: e.target.value })}
                          className="w-full min-h-[60px] p-3 border-4 border-black bg-neutral-50 font-mono text-xs uppercase placeholder:text-neutral-400 focus:outline-none focus:bg-white transition-colors resize-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Workout Tracking */}
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <button
          onClick={() => setIsWorkoutsExpanded(!isWorkoutsExpanded)}
          className="w-full border-b-4 border-black bg-black p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center bg-primary">
              <Dumbbell className="h-6 w-6 text-black" />
            </div>
            <div className="text-start">
              <h2 className="font-black text-xl text-cream tracking-tight">
                {t("workoutTracking").toUpperCase()}
              </h2>
              <p className="font-bold text-sm text-primary">
                {todaysWorkout?.restDay
                  ? tWorkouts("restDay").toUpperCase()
                  : trackingData.workoutCompletions.filter((c) => c.completed).length > 0
                  ? t("workoutCompleted").toUpperCase()
                  : t("workoutNotCompleted").toUpperCase()}
              </p>
            </div>
          </div>
          <div className="h-10 w-10 flex items-center justify-center bg-primary text-black">
            {isWorkoutsExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </button>

        {isWorkoutsExpanded && (
          <div className="p-5">
            {!todaysWorkout ? (
              <div className="p-8 text-center border-4 border-dashed border-black">
                <Dumbbell className="mx-auto h-12 w-12 text-neutral-300" />
                <p className="mt-4 font-black">{t("noWorkoutPlanned").toUpperCase()}</p>
              </div>
            ) : todaysWorkout.restDay ? (
              <div className="p-8 text-center border-4 border-black bg-neutral-100">
                <Dumbbell className="mx-auto h-12 w-12 text-neutral-400" />
                <p className="mt-4 font-black text-xl">{tWorkouts("restDay").toUpperCase()}</p>
                <p className="mt-2 font-mono text-xs text-neutral-500">
                  {t("takeTimeToRecover").toUpperCase()}
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <button
                  onClick={() => handleWorkoutToggle(0, getWorkoutCompletion(0)?.completed || false)}
                  disabled={isTogglingWorkout === 0}
                  className={`h-12 w-12 shrink-0 border-4 border-black flex items-center justify-center transition-colors ${
                    getWorkoutCompletion(0)?.completed ? "bg-success-500" : "bg-cream hover:bg-neutral-100"
                  }`}
                >
                  {isTogglingWorkout === 0 ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : getWorkoutCompletion(0)?.completed ? (
                    <CheckCircle2 className="h-6 w-6 text-black" />
                  ) : (
                    <Circle className="h-6 w-6 text-neutral-400" />
                  )}
                </button>

                <div className="flex-1 space-y-4">
                  <div>
                    <h4 className="font-black text-lg tracking-tight">
                      {todaysWorkout.workoutName?.toUpperCase() || tWorkouts("todaysWorkout").toUpperCase()}
                    </h4>
                    <p className="font-bold text-sm text-neutral-500 mt-1">
                      {todaysWorkout.duration} {tCommon("min").toUpperCase()} • {todaysWorkout.targetMuscles?.join(", ").toUpperCase()}
                    </p>
                  </div>

                  <div className="flex gap-4 font-bold text-sm">
                    <span className="px-2 py-1 border-2 border-black bg-neutral-100">
                      {todaysWorkout.exercises?.length || 0} {tWorkouts("exercises").toUpperCase()}
                    </span>
                  </div>

                  <textarea
                    placeholder={t("addWorkoutNotes").toUpperCase()}
                    value={workoutNotes[0] || getWorkoutCompletion(0)?.notes || ""}
                    onChange={(e) => setWorkoutNotes({ ...workoutNotes, [0]: e.target.value })}
                    className="w-full min-h-[60px] p-3 border-4 border-black bg-neutral-50 font-bold text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:bg-white transition-colors resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Daily Reflection */}
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-primary p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center bg-black">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-black text-xl text-black tracking-tight">
              {t("dailyReflection").toUpperCase()}
            </h2>
            <p className="font-mono text-xs text-black/70">{t("howWasYourDay").toUpperCase()}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit(onReflectionSubmit)} className="p-5 space-y-4">
          <textarea
            {...register("reflection")}
            placeholder={t("writeReflection").toUpperCase()}
            className="w-full min-h-[120px] p-4 border-4 border-black bg-neutral-50 font-mono text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:bg-white transition-colors resize-none"
          />
          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="h-12 px-6 bg-black text-cream font-black text-sm uppercase tracking-wide hover:bg-primary disabled:opacity-50 transition-colors"
          >
            {formState.isSubmitting ? t("saving").toUpperCase() : t("saveReflection").toUpperCase()}
          </button>
        </form>
      </div>
    </div>
  );
}
