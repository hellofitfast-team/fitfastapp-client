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

export default function DashboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { dashboardData, isLoading, error } = useDashboardData();

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

  const userName = dashboardData.profile?.fullName?.split(" ")[0] || (locale === "ar" ? "مستخدم" : "User");

  // Resolve a day plan from weeklyPlan — tries "dayN" first, then weekday names
  const resolveDayPlan = (weeklyPlan: Record<string, any> | undefined, startDate?: string) => {
    if (!weeklyPlan || !startDate) return null;
    const diff = Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000);
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
  };

  // Derive today's meals from meal plan + completions
  const mealPlanData = dashboardData.currentMealPlan?.planData as unknown as GeneratedMealPlan | undefined;
  const todaysMealDayPlan = resolveDayPlan(mealPlanData?.weeklyPlan, dashboardData.currentMealPlan?.startDate);
  const todaysMealData = todaysMealDayPlan?.meals ?? [];
  const todayMealCompletions = dashboardData.todayMealCompletions ?? [];
  const todayWorkoutCompletions = dashboardData.todayWorkoutCompletions ?? [];

  const todaysMeals = todaysMealData.map((meal: any, idx: number) => {
    const macros = meal.macros || {};
    return {
      id: idx,
      name: meal.name,
      time: meal.type || "",
      calories: meal.calories ?? macros.calories ?? 0,
      done: todayMealCompletions.some((c) => c.mealIndex === idx && c.completed),
    };
  });

  // Derive today's workout from workout plan + completions
  const workoutPlanData = dashboardData.currentWorkoutPlan?.planData as unknown as GeneratedWorkoutPlan | undefined;
  const todaysWorkoutData = resolveDayPlan(workoutPlanData?.weeklyPlan, dashboardData.currentWorkoutPlan?.startDate);
  const workoutExercises = Array.isArray(todaysWorkoutData?.exercises) ? todaysWorkoutData.exercises
    : Array.isArray(todaysWorkoutData?.workout) ? todaysWorkoutData.workout
    : [];
  const todaysWorkout = todaysWorkoutData && !todaysWorkoutData.restDay
    ? {
        name: todaysWorkoutData.workoutName || todaysWorkoutData.name || "",
        type: (Array.isArray(todaysWorkoutData.targetMuscles) ? todaysWorkoutData.targetMuscles : []).join(", "),
        duration: todaysWorkoutData.duration ? `${todaysWorkoutData.duration}m` : "-",
        exercises: workoutExercises.length,
        done: todayWorkoutCompletions.some((c) => c.completed),
      }
    : null;

  const mealProgress = {
    completed: todaysMeals.filter((m: any) => m.done).length,
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

  // Coach message banner (HOME-04)
  const unreadCoachTicket = (dashboardData.recentTickets ?? []).find(
    (ticket: { status: string; _id: string }) => ticket.status === "coach_responded"
  );

  // Plan countdown (HOME-05)
  const mealPlanStartDate = dashboardData.currentMealPlan?.startDate;
  const mealPlanEndDate = dashboardData.currentMealPlan?.endDate;
  const planTotalDays = mealPlanStartDate && mealPlanEndDate
    ? Math.ceil((new Date(mealPlanEndDate).getTime() - new Date(mealPlanStartDate).getTime()) / 86400000)
    : 14;
  const planCurrentDay = mealPlanStartDate
    ? Math.min(planTotalDays, Math.max(1, Math.floor((Date.now() - new Date(mealPlanStartDate).getTime()) / 86400000) + 1))
    : null;

  // No plan empty state
  if (!dashboardData.currentMealPlan && !dashboardData.currentWorkoutPlan) {
    return (
      <div className="px-4 py-6 space-y-6 max-w-5xl mx-auto lg:px-6">
        <div>
          <p className="text-sm text-muted-foreground">
            {formatDateWithWeekday(new Date(), locale)}
          </p>
          <h1 key={messageIndex} className="text-2xl font-bold mt-1 animate-fade-in">
            {t(`dashboard.motivational.${messageIndex}`, { name: userName })}
          </h1>
        </div>
        <EmptyState
          icon={Dumbbell}
          title={t("emptyStates.noPlan.title")}
          description={t("emptyStates.noPlan.description")}
        />
      </div>
    );
  }

  // Card content for carousel/grid
  const cards = [
    // Card 1: Today's Stats
    <WidgetCard key="stats" featureColor="primary" title={t("dashboard.todaysStats")} className="h-full">
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <p className="text-lg font-bold">{overallProgress}%</p>
          <p className="text-[10px] text-muted-foreground">{t("tracking.todaysProgress")}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{nextCheckInDisplay}</p>
          <p className="text-[10px] text-muted-foreground">{t("dashboard.upcomingCheckIn")}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{mealProgress.completed}/{mealProgress.total}</p>
          <p className="text-[10px] text-muted-foreground">{t("dashboard.todaysMeals")}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{workoutProgress.completed}/{workoutProgress.total}</p>
          <p className="text-[10px] text-muted-foreground">{t("dashboard.todaysWorkout")}</p>
        </div>
      </div>
    </WidgetCard>,

    // Card 2: Today's Meals
    <WidgetCard key="meals" featureColor="nutrition" icon={UtensilsCrossed} title={t("dashboard.todaysMeals")} className="h-full">
      {todaysMeals.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("dashboard.noMealsToday")}</p>
      ) : (
        <div className="space-y-1.5">
          <p className="text-lg font-bold">{t("dashboard.totalCalories")}: {todaysMeals.reduce((sum: number, m: any) => sum + m.calories, 0)}</p>
          <p className="text-xs text-muted-foreground">{t("dashboard.mealCount", { count: todaysMeals.length })}</p>
          <div className="space-y-1">
            {todaysMeals.slice(0, 3).map((meal: any) => (
              <p key={meal.id} className={cn("text-xs truncate", meal.done && "line-through text-muted-foreground")}>
                {meal.name}
              </p>
            ))}
            {todaysMeals.length > 3 && <p className="text-[10px] text-muted-foreground">...</p>}
          </div>
        </div>
      )}
    </WidgetCard>,

    // Card 3: Today's Workout
    <WidgetCard key="workout" featureColor="fitness" icon={Dumbbell} title={t("dashboard.todaysWorkout")} className="h-full">
      {todaysWorkout ? (
        <div className="space-y-1.5">
          <p className="text-sm font-semibold">{todaysWorkout.name}</p>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.exerciseCount", { count: todaysWorkout.exercises })} - {t("dashboard.estDuration", { duration: todaysWorkout.duration })}
          </p>
          {todaysWorkout.done && (
            <span className="inline-block rounded-full bg-[#F97316]/10 text-[#F97316] px-2 py-0.5 text-[10px] font-medium">
              {t("dashboard.completedToday")}
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("dashboard.restDayOrNoWorkout")}</p>
      )}
    </WidgetCard>,

    // Card 4: Plan Countdown (HOME-05)
    <WidgetCard key="countdown" featureColor="routine" icon={Calendar} title={t("dashboard.planProgress")} className="h-full">
      {planCurrentDay ? (
        <div className="space-y-2">
          <p className="text-lg font-bold">
            {t("dashboard.planDay", { current: planCurrentDay, total: planTotalDays })}
          </p>
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden" dir={locale === "ar" ? "rtl" : "ltr"}>
            <div
              className="h-full bg-[#8B5CF6] rounded-full transition-all"
              style={{ width: `${(planCurrentDay / planTotalDays) * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">-</p>
      )}
    </WidgetCard>,
  ];

  return (
    <div className="px-4 py-6 space-y-5 max-w-5xl mx-auto lg:px-6">
      {/* Greeting (HOME-01) */}
      <div>
        <p className="text-sm text-muted-foreground">
          {formatDateWithWeekday(new Date(), locale)}
        </p>
        <h1 key={messageIndex} className="text-2xl font-bold mt-1 animate-fade-in">
          {t(`dashboard.motivational.${messageIndex}`, { name: userName })}
        </h1>
      </div>

      {/* Coach Message Banner (HOME-04) */}
      {unreadCoachTicket && !bannerDismissed && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center gap-3 animate-slide-up">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <p className="flex-1 text-sm font-medium">{t("dashboard.coachMessageBanner")}</p>
          <Link
            href={`/tickets/${unreadCoachTicket._id}`}
            className="text-xs font-semibold text-primary hover:underline shrink-0"
          >
            {t("dashboard.viewTicket")}
          </Link>
          <button onClick={() => setBannerDismissed(true)} className="shrink-0 p-1 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Flame, color: "streak" as const, label: t("tracking.streakDays"), value: `${overallProgress}%` },
          { icon: UtensilsCrossed, color: "nutrition" as const, label: t("dashboard.mealProgress"), value: `${mealProgress.completed}/${mealProgress.total}` },
          { icon: Dumbbell, color: "fitness" as const, label: t("dashboard.workoutProgress"), value: `${workoutProgress.completed}/${workoutProgress.total}` },
          { icon: Calendar, color: "routine" as const, label: t("dashboard.upcomingCheckIn"), value: nextCheckInDisplay },
        ].map((stat, i) => (
          <div key={i} className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            <WidgetCard icon={stat.icon} title={stat.label} value={stat.value} featureColor={stat.color} />
          </div>
        ))}
      </div>

      {/* Mobile Carousel (HOME-02) */}
      <div className="lg:hidden relative -mx-4">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        >
          {cards.map((card, i) => (
            <div
              key={i}
              ref={(el) => { cardRefs.current[i] = el; }}
              className="flex-shrink-0 w-full snap-center px-4"
            >
              <div className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                {card}
              </div>
            </div>
          ))}
        </div>
        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 mt-3">
          {[0, 1, 2, 3].map((i) => (
            <button
              key={i}
              onClick={() => { scrollToIndex(i); setActiveCardIndex(i); }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                activeCardIndex === i ? "w-4 bg-primary" : "w-1.5 bg-neutral-300"
              )}
            />
          ))}
        </div>
      </div>

      {/* Desktop Grid (HOME-03) */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-4">
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
          className="group rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-md active:scale-[0.97]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF4500]/12 mb-3">
            <ClipboardCheck className="h-5 w-5 text-[#FF4500]" />
          </div>
          <p className="font-semibold text-sm">{t("checkIn.submitCheckIn")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t("checkIn.title")}</p>
        </Link>
        <Link
          href="/progress"
          className="group rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-md active:scale-[0.97]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF4500]/12 mb-3">
            <TrendingUp className="h-5 w-5 text-[#FF4500]" />
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
