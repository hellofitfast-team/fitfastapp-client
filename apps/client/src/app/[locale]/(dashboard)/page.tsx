"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@fitfast/i18n/navigation";
import {
  ClipboardCheck,
  TrendingUp,
  UtensilsCrossed,
  Dumbbell,
  Flame,
  Calendar,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useDashboardData } from "@/hooks/use-dashboard";
import { cn } from "@fitfast/ui/cn";
import { formatDateWithWeekday } from "@/lib/utils";
import type { GeneratedMealPlan } from "@/lib/ai/meal-plan-generator";
import type { GeneratedWorkoutPlan } from "@/lib/ai/workout-plan-generator";

export default function DashboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { dashboardData, isLoading, error } = useDashboardData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-500/10">
            <AlertCircle className="h-6 w-6 text-error-500" />
          </div>
          <p className="font-semibold text-error-500">{t("common.error")}</p>
        </div>
      </div>
    );
  }

  const checkInLock = dashboardData.checkInLock;
  const nextCheckInDays = checkInLock.isLocked && checkInLock.nextCheckInDate
    ? Math.ceil((new Date(checkInLock.nextCheckInDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const nextCheckInDisplay = nextCheckInDays !== null ? `${nextCheckInDays}d` : "-";

  const userName = dashboardData.profile?.fullName || (locale === "ar" ? "مستخدم" : "User");

  // Derive today's meals from meal plan + completions
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const todayDayName = dayNames[new Date().getDay()];
  const mealPlanData = dashboardData.currentMealPlan?.planData as unknown as GeneratedMealPlan | undefined;
  const todaysMealData = mealPlanData?.weeklyPlan?.[todayDayName]?.meals ?? [];
  const todayMealCompletions = dashboardData.todayMealCompletions ?? [];
  const todayWorkoutCompletions = dashboardData.todayWorkoutCompletions ?? [];

  const todaysMeals = todaysMealData.map((meal, idx) => ({
    id: idx,
    name: meal.name,
    time: meal.type || "",
    calories: meal.calories || 0,
    done: todayMealCompletions.some((c) => c.mealIndex === idx && c.completed),
  }));

  // Derive today's workout from workout plan + completions
  const workoutPlanData = dashboardData.currentWorkoutPlan?.planData as unknown as GeneratedWorkoutPlan | undefined;
  const todaysWorkoutData = workoutPlanData?.weeklyPlan?.[todayDayName];
  const todaysWorkout = todaysWorkoutData && !todaysWorkoutData.restDay
    ? {
        name: todaysWorkoutData.workoutName || todayDayName,
        type: todaysWorkoutData.targetMuscles?.join(", ") || "",
        duration: todaysWorkoutData.duration ? `${todaysWorkoutData.duration}m` : "-",
        exercises: todaysWorkoutData.exercises?.length ?? 0,
        done: todayWorkoutCompletions.some((c) => c.completed),
      }
    : null;

  const mealProgress = {
    completed: todaysMeals.filter((m) => m.done).length,
    total: todaysMeals.length,
  };
  const workoutProgress = {
    completed: todaysWorkout?.done ? 1 : 0,
    total: todaysWorkout ? 1 : 0,
  };
  const totalItems = mealProgress.total + workoutProgress.total;
  const completedItems = mealProgress.completed + workoutProgress.completed;
  const overallProgress = totalItems > 0
    ? Math.round((completedItems / totalItems) * 100)
    : 0;

  return (
    <div className="px-4 py-6 space-y-6 max-w-5xl mx-auto lg:px-6">
      {/* Greeting */}
      <div>
        <p className="text-sm text-muted-foreground">
          {formatDateWithWeekday(new Date(), locale)}
        </p>
        <h1 className="text-2xl font-bold mt-1">
          {t("dashboard.welcome")} <span className="text-primary">{userName}</span>
        </h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F59E0B]/12">
              <Flame className="h-3.5 w-3.5 text-[#F59E0B]" />
            </div>
            <span className="text-xs text-muted-foreground">{t("tracking.streakDays")}</span>
          </div>
          <p className="text-2xl font-bold">{overallProgress}%</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#10B981]/12">
              <UtensilsCrossed className="h-3.5 w-3.5 text-[#10B981]" />
            </div>
            <span className="text-xs text-muted-foreground">{t("dashboard.mealProgress")}</span>
          </div>
          <p className="text-2xl font-bold">
            {mealProgress.completed}
            <span className="text-muted-foreground text-base">/{mealProgress.total}</span>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F97316]/12">
              <Dumbbell className="h-3.5 w-3.5 text-[#F97316]" />
            </div>
            <span className="text-xs text-muted-foreground">{t("dashboard.workoutProgress")}</span>
          </div>
          <p className="text-2xl font-bold">
            {workoutProgress.completed}
            <span className="text-muted-foreground text-base">/{workoutProgress.total}</span>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8B5CF6]/12">
              <Calendar className="h-3.5 w-3.5 text-[#8B5CF6]" />
            </div>
            <span className="text-xs text-muted-foreground">{t("dashboard.upcomingCheckIn")}</span>
          </div>
          <p className="text-2xl font-bold">{nextCheckInDisplay}</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Meals */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-[#10B981]" />
              <h2 className="font-semibold">{t("meals.todaysMeals")}</h2>
            </div>
            <Link
              href="/meal-plan"
              className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
            >
              {t("dashboard.viewPlan")}
              <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {todaysMeals.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {locale === "ar" ? "لا توجد وجبات اليوم" : "No meals for today"}
              </div>
            ) : (
              todaysMeals.map((meal) => (
                <div
                  key={meal.id}
                  className={cn(
                    "flex items-center gap-3 p-3.5 transition-colors",
                    meal.done && "opacity-60"
                  )}
                >
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                    meal.done
                      ? "bg-primary/10 text-primary"
                      : "bg-neutral-100 text-muted-foreground"
                  )}>
                    {meal.time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium text-sm truncate",
                      meal.done && "line-through"
                    )}>
                      {meal.name}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {meal.calories} {locale === "ar" ? "سعرة" : "kcal"}
                  </span>
                  <div className={cn(
                    "h-5 w-5 shrink-0 rounded-md border-2 transition-colors",
                    meal.done
                      ? "border-primary bg-primary"
                      : "border-neutral-300"
                  )}>
                    {meal.done && (
                      <svg className="h-full w-full text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Today's Workout */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-[#F97316]" />
              <h2 className="font-semibold">{t("nav.workoutPlan")}</h2>
            </div>
            <Link
              href="/workout-plan"
              className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
            >
              {t("dashboard.viewPlan")}
              <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            </Link>
          </div>
          {todaysWorkout ? (
            <div className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">{todaysWorkout.type}</p>
                  <h3 className="font-semibold text-lg mt-0.5">{todaysWorkout.name}</h3>
                </div>
                {todaysWorkout.done && (
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    {t("dashboard.completedToday")}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg bg-neutral-50 p-3 text-center">
                  <p className="text-xl font-bold">{todaysWorkout.duration}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("workouts.duration")}</p>
                </div>
                <div className="rounded-lg bg-neutral-50 p-3 text-center">
                  <p className="text-xl font-bold">{todaysWorkout.exercises}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("workouts.exercises")}</p>
                </div>
              </div>
              <Link href="/workout-plan">
                <button className={cn(
                  "w-full py-3 rounded-lg font-semibold text-sm transition-all active:scale-[0.97]",
                  todaysWorkout.done
                    ? "bg-neutral-100 text-foreground hover:bg-neutral-200"
                    : "bg-primary text-white hover:bg-primary/90"
                )}>
                  {todaysWorkout.done ? t("dashboard.viewPlan") : t("dashboard.startWorkout")}
                </button>
              </Link>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground text-sm">
                {locale === "ar" ? "يوم راحة أو لا يوجد تمرين اليوم" : "Rest day or no workout today"}
              </p>
              <Link
                href="/workout-plan"
                className="inline-block mt-3 text-sm text-primary font-medium hover:underline"
              >
                {t("dashboard.viewPlan")}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/check-in"
          className="group rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-md active:scale-[0.97]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4169E1]/12 mb-3">
            <ClipboardCheck className="h-5 w-5 text-[#4169E1]" />
          </div>
          <p className="font-semibold text-sm">{t("checkIn.submitCheckIn")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t("checkIn.title")}</p>
        </Link>
        <Link
          href="/progress"
          className="group rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-md active:scale-[0.97]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4169E1]/12 mb-3">
            <TrendingUp className="h-5 w-5 text-[#4169E1]" />
          </div>
          <p className="font-semibold text-sm">{t("progress.title")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t("progress.weightHistory")}</p>
        </Link>
      </div>

      {/* Progress Overview */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">{t("progress.title")}</p>
          <p className="text-sm font-bold text-primary">{overallProgress}%</p>
        </div>
        <div className="h-2 rounded-full bg-neutral-100 overflow-hidden" dir={locale === "ar" ? "rtl" : "ltr"}>
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
