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
  Shield,
  X,
} from "lucide-react";
import { useDashboardData } from "@/hooks/use-dashboard";
import { WidgetCard } from "@fitfast/ui/widget-card";
import { EmptyState } from "@fitfast/ui/empty-state";
import { cn } from "@fitfast/ui/cn";
import { formatDateWithWeekday } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback } from "react";
import type { GeneratedMealPlan } from "@/lib/ai/meal-plan-generator";
import type { GeneratedWorkoutPlan } from "@/lib/ai/workout-plan-generator";

/** Simplified meal used in the dashboard summary cards */
interface DashboardMeal {
  id: number;
  name: string;
  time: string;
  calories: number;
  done: boolean;
}

/** Raw meal data from the AI-generated plan (may have nested or flat macros) */
interface RawMealData {
  name?: string;
  type?: string;
  calories?: number;
  macros?: { calories?: number };
}

/** Shape of a meal day plan from AI output */
interface MealDayPlan {
  meals?: RawMealData[];
  dailyTotals?: { calories?: number; protein?: number; carbs?: number; fat?: number };
  [key: string]: unknown;
}

/** Shape of a workout day plan from AI output */
interface WorkoutDayPlan {
  workoutName?: string;
  name?: string;
  restDay?: boolean;
  duration?: number;
  targetMuscles?: string[];
  exercises?: Array<{ name?: string; [key: string]: unknown }>;
  workout?: Array<{ name?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

export default function DashboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { dashboardData, isLoading, error } = useDashboardData();

  const [now] = useState(() => Date.now());

  // Rotating motivational greeting (HOME-01)
  const [messageIndex, setMessageIndex] = useState(0);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % 7);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Mobile carousel state (HOME-02)
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToIndex = useCallback((index: number) => {
    const card = cardRefs.current[index];
    card?.scrollIntoView({ behavior: "smooth", inline: "center" });
  }, []);

  // Auto-scroll carousel every 4 seconds
  useEffect(() => {
    autoScrollRef.current = setInterval(() => {
      setActiveCardIndex((prev) => {
        const next = (prev + 1) % 4;
        scrollToIndex(next);
        return next;
      });
    }, 4000);
    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [scrollToIndex]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.offsetWidth);
    setActiveCardIndex(Math.max(0, Math.min(3, Math.abs(index))));
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 px-4 text-center">
          <div className="bg-error-500/10 flex h-12 w-12 items-center justify-center rounded-full">
            <AlertCircle className="text-error-500 h-6 w-6" />
          </div>
          <p className="text-error-500 font-semibold">{t("common.error")}</p>
        </div>
      </div>
    );
  }

  const checkInLock = dashboardData.checkInLock;
  const nextCheckInDays =
    checkInLock.isLocked && checkInLock.nextCheckInDate
      ? Math.ceil((new Date(checkInLock.nextCheckInDate).getTime() - now) / (1000 * 60 * 60 * 24))
      : null;
  const nextCheckInDisplay = nextCheckInDays !== null ? `${nextCheckInDays}d` : "-";

  const userName =
    dashboardData.profile?.fullName?.split(" ")[0] || (locale === "ar" ? "مستخدم" : "User");

  // Resolve a day plan from weeklyPlan — tries "dayN" first, then weekday names
  function resolveDayPlan<T>(
    weeklyPlan: Record<string, T> | undefined,
    startDate?: string,
  ): T | null {
    if (!weeklyPlan || !startDate) return null;
    const diff = Math.floor((now - new Date(startDate).getTime()) / 86400000);
    const dayIndex = Math.max(0, diff);

    // Try new format: "day1", "day2", ...
    const dayKey = `day${dayIndex + 1}`;
    if (weeklyPlan[dayKey]) return weeklyPlan[dayKey];

    // Try old format: weekday name
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayIndex);
    const weekdayName = dayNames[date.getDay()];
    if (weeklyPlan[weekdayName]) return weeklyPlan[weekdayName];

    return null;
  }

  // Derive today's meals from meal plan + completions
  const mealPlanData = dashboardData.currentMealPlan?.planData as unknown as
    | GeneratedMealPlan
    | undefined;
  const todaysMealDayPlan = resolveDayPlan<MealDayPlan>(
    mealPlanData?.weeklyPlan as Record<string, MealDayPlan> | undefined,
    dashboardData.currentMealPlan?.startDate,
  );
  const todaysMealData = todaysMealDayPlan?.meals ?? [];
  const todayMealCompletions = dashboardData.todayMealCompletions ?? [];
  const todayWorkoutCompletions = dashboardData.todayWorkoutCompletions ?? [];

  const todaysMeals: DashboardMeal[] = todaysMealData.map((meal: RawMealData, idx: number) => {
    const macros = meal.macros || {};
    return {
      id: idx,
      name: meal.name || "",
      time: meal.type || "",
      calories: meal.calories ?? macros.calories ?? 0,
      done: todayMealCompletions.some((c) => c.mealIndex === idx && c.completed),
    };
  });

  // Derive today's workout from workout plan + completions
  const workoutPlanData = dashboardData.currentWorkoutPlan?.planData as unknown as
    | GeneratedWorkoutPlan
    | undefined;
  const todaysWorkoutData = resolveDayPlan<WorkoutDayPlan>(
    workoutPlanData?.weeklyPlan as Record<string, WorkoutDayPlan> | undefined,
    dashboardData.currentWorkoutPlan?.startDate,
  );
  const workoutExercises = Array.isArray(todaysWorkoutData?.exercises)
    ? todaysWorkoutData.exercises
    : Array.isArray(todaysWorkoutData?.workout)
      ? todaysWorkoutData.workout
      : [];
  const todaysWorkout =
    todaysWorkoutData && !todaysWorkoutData.restDay
      ? {
          name: (todaysWorkoutData.workoutName || todaysWorkoutData.name || "") as string,
          type: (Array.isArray(todaysWorkoutData.targetMuscles)
            ? todaysWorkoutData.targetMuscles
            : []
          ).join(", "),
          duration: todaysWorkoutData.duration ? `${todaysWorkoutData.duration}m` : "-",
          exercises: workoutExercises.length,
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
  const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Coach message banner (HOME-04)
  const unreadCoachTicket = (dashboardData.recentTickets ?? []).find(
    (ticket: { status: string; _id: string }) => ticket.status === "coach_responded",
  );

  // Plan countdown (HOME-05)
  const mealPlanStartDate = dashboardData.currentMealPlan?.startDate;
  const mealPlanEndDate = dashboardData.currentMealPlan?.endDate;
  const planTotalDays =
    mealPlanStartDate && mealPlanEndDate
      ? Math.ceil(
          (new Date(mealPlanEndDate).getTime() - new Date(mealPlanStartDate).getTime()) / 86400000,
        )
      : 14;
  const planCurrentDay = mealPlanStartDate
    ? Math.min(
        planTotalDays,
        Math.max(1, Math.floor((now - new Date(mealPlanStartDate).getTime()) / 86400000) + 1),
      )
    : null;

  // No plan empty state — distinguish "generating" vs "no assessment"
  if (!dashboardData.currentMealPlan && !dashboardData.currentWorkoutPlan) {
    const hasAssessment = !!dashboardData.assessment;
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-6">
        <div>
          <p className="text-muted-foreground text-sm">
            {formatDateWithWeekday(new Date(), locale)}
          </p>
          <h1 key={messageIndex} className="animate-fade-in mt-1 text-2xl font-bold">
            {t(`dashboard.motivational.${messageIndex}`, { name: userName })}
          </h1>
        </div>
        {hasAssessment ? (
          <div className="border-border bg-card space-y-4 rounded-xl border p-8 text-center">
            <Loader2 className="text-primary mx-auto h-10 w-10 animate-spin" />
            <h2 className="text-lg font-bold">{t("emptyStates.plansGenerating.title")}</h2>
            <p className="text-muted-foreground mx-auto max-w-md text-sm">
              {t("emptyStates.plansGenerating.description")}
            </p>
          </div>
        ) : (
          <EmptyState
            icon={Dumbbell}
            title={t("emptyStates.noPlan.title")}
            description={t("emptyStates.noPlan.description")}
          />
        )}
      </div>
    );
  }

  // Card content for carousel/grid
  const cards = [
    // Card 1: Today's Stats
    <WidgetCard
      key="stats"
      featureColor="primary"
      title={t("dashboard.todaysStats")}
      className="h-full"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <p className="text-lg font-bold">{overallProgress}%</p>
          <p className="text-muted-foreground text-[10px]">{t("tracking.todaysProgress")}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{nextCheckInDisplay}</p>
          <p className="text-muted-foreground text-[10px]">{t("dashboard.upcomingCheckIn")}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">
            {mealProgress.completed}/{mealProgress.total}
          </p>
          <p className="text-muted-foreground text-[10px]">{t("dashboard.todaysMeals")}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">
            {workoutProgress.completed}/{workoutProgress.total}
          </p>
          <p className="text-muted-foreground text-[10px]">{t("dashboard.todaysWorkout")}</p>
        </div>
      </div>
    </WidgetCard>,

    // Card 2: Today's Meals
    <WidgetCard
      key="meals"
      featureColor="nutrition"
      icon={UtensilsCrossed}
      title={t("dashboard.todaysMeals")}
      className="h-full"
    >
      {todaysMeals.length === 0 ? (
        <p className="text-muted-foreground text-xs">{t("dashboard.noMealsToday")}</p>
      ) : (
        <div className="space-y-1.5">
          <p className="text-lg font-bold">
            {t("dashboard.totalCalories")}: {todaysMeals.reduce((sum, m) => sum + m.calories, 0)}
          </p>
          <p className="text-muted-foreground text-xs">
            {t("dashboard.mealCount", { count: todaysMeals.length })}
          </p>
          <div className="space-y-1">
            {todaysMeals.slice(0, 3).map((meal) => (
              <p
                key={meal.id}
                className={cn(
                  "truncate text-xs",
                  meal.done && "text-muted-foreground line-through",
                )}
              >
                {meal.name}
              </p>
            ))}
            {todaysMeals.length > 3 && <p className="text-muted-foreground text-[10px]">...</p>}
          </div>
        </div>
      )}
    </WidgetCard>,

    // Card 3: Today's Workout
    <WidgetCard
      key="workout"
      featureColor="fitness"
      icon={Dumbbell}
      title={t("dashboard.todaysWorkout")}
      className="h-full"
    >
      {todaysWorkout ? (
        <div className="space-y-1.5">
          <p className="text-sm font-semibold">{todaysWorkout.name}</p>
          <p className="text-muted-foreground text-xs">
            {t("dashboard.exerciseCount", { count: todaysWorkout.exercises })} -{" "}
            {t("dashboard.estDuration", { duration: todaysWorkout.duration })}
          </p>
          {todaysWorkout.done && (
            <span className="bg-fitness/10 text-fitness inline-block rounded-full px-2 py-0.5 text-[10px] font-medium">
              {t("dashboard.completedToday")}
            </span>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">{t("dashboard.restDayOrNoWorkout")}</p>
      )}
    </WidgetCard>,

    // Card 4: Plan Countdown (HOME-05)
    <WidgetCard
      key="countdown"
      featureColor="routine"
      icon={Calendar}
      title={t("dashboard.planProgress")}
      className="h-full"
    >
      {planCurrentDay ? (
        <div className="space-y-2">
          <p className="text-lg font-bold">
            {t("dashboard.planDay", { current: planCurrentDay, total: planTotalDays })}
          </p>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-neutral-100"
            dir={locale === "ar" ? "rtl" : "ltr"}
          >
            <div
              className="bg-routine h-full rounded-full transition-all"
              style={{ width: `${(planCurrentDay / planTotalDays) * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">-</p>
      )}
    </WidgetCard>,
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 lg:px-6">
      {/* Greeting (HOME-01) */}
      <div>
        <p className="text-muted-foreground text-sm">{formatDateWithWeekday(new Date(), locale)}</p>
        <h1 key={messageIndex} className="animate-fade-in mt-1 text-2xl font-bold">
          {t(`dashboard.motivational.${messageIndex}`, { name: userName })}
        </h1>
      </div>

      {/* Coach Message Banner (HOME-04) */}
      {unreadCoachTicket && !bannerDismissed && (
        <div className="bg-primary/10 border-primary/20 animate-slide-up flex items-center gap-3 rounded-xl border p-3">
          <div className="bg-primary/15 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            <Shield className="text-primary h-4 w-4" />
          </div>
          <p className="flex-1 text-sm font-medium">{t("dashboard.coachMessageBanner")}</p>
          <Link
            href={`/tickets/${unreadCoachTicket._id}`}
            className="text-primary shrink-0 text-xs font-semibold hover:underline"
          >
            {t("dashboard.viewTicket")}
          </Link>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-muted-foreground hover:text-foreground shrink-0 p-1"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            icon: Flame,
            color: "streak" as const,
            label: t("tracking.streakDays"),
            value: `${overallProgress}%`,
          },
          {
            icon: UtensilsCrossed,
            color: "nutrition" as const,
            label: t("dashboard.mealProgress"),
            value: `${mealProgress.completed}/${mealProgress.total}`,
          },
          {
            icon: Dumbbell,
            color: "fitness" as const,
            label: t("dashboard.workoutProgress"),
            value: `${workoutProgress.completed}/${workoutProgress.total}`,
          },
          {
            icon: Calendar,
            color: "routine" as const,
            label: t("dashboard.upcomingCheckIn"),
            value: nextCheckInDisplay,
          },
        ].map((stat, i) => (
          <div key={i} className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            <WidgetCard
              icon={stat.icon}
              title={stat.label}
              value={stat.value}
              featureColor={stat.color}
            />
          </div>
        ))}
      </div>

      {/* Mobile Carousel (HOME-02) */}
      <div className="relative -mx-4 lg:hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="scrollbar-hide flex snap-x snap-mandatory overflow-x-auto"
        >
          {cards.map((card, i) => (
            <div
              key={i}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="w-full flex-shrink-0 snap-center px-4"
            >
              <div className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                {card}
              </div>
            </div>
          ))}
        </div>
        {/* Dot indicators */}
        <div className="mt-3 flex justify-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <button
              key={i}
              onClick={() => {
                scrollToIndex(i);
                setActiveCardIndex(i);
              }}
              aria-label={`Go to card ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                activeCardIndex === i ? "bg-primary w-4" : "w-1.5 bg-neutral-300",
              )}
            />
          ))}
        </div>
      </div>

      {/* Desktop Grid (HOME-03) */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-2">
        {cards.map((card, i) => (
          <div key={i} className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            {card}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/check-in"
          className="group border-border bg-card shadow-card rounded-xl border p-5 transition-all hover:shadow-md active:scale-[0.97]"
        >
          <div className="bg-primary/12 mb-3 flex h-10 w-10 items-center justify-center rounded-lg">
            <ClipboardCheck className="text-primary h-5 w-5" />
          </div>
          <p className="text-sm font-semibold">{t("checkIn.submitCheckIn")}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">{t("checkIn.title")}</p>
        </Link>
        <Link
          href="/progress"
          className="group border-border bg-card shadow-card rounded-xl border p-5 transition-all hover:shadow-md active:scale-[0.97]"
        >
          <div className="bg-primary/12 mb-3 flex h-10 w-10 items-center justify-center rounded-lg">
            <TrendingUp className="text-primary h-5 w-5" />
          </div>
          <p className="text-sm font-semibold">{t("progress.title")}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">{t("progress.weightHistory")}</p>
        </Link>
      </div>

      {/* Progress Overview */}
      <div className="border-border bg-card shadow-card rounded-xl border p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">{t("progress.title")}</p>
          <p className="text-primary text-sm font-bold">{overallProgress}%</p>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-neutral-100"
          dir={locale === "ar" ? "rtl" : "ltr"}
        >
          <div
            className="bg-primary h-full rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
