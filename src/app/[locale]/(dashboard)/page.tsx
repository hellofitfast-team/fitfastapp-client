"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ClipboardCheck,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardData } from "@/hooks/use-dashboard";
import { cn } from "@/lib/utils/cn";
import { formatDateWithWeekday } from "@/lib/utils";

// StatCard component with CSS-only hover states
function StatCard({
  label,
  value,
  suffix,
  hoverBg,
  className = ""
}: {
  label: string;
  value: string;
  suffix?: string;
  hoverBg: "black" | "orange";
  className?: string;
}) {
  const isOrange = hoverBg === "orange";

  return (
    <div
      className={`group border-e-4 border-black p-6 transition-colors cursor-pointer ${
        isOrange ? "hover:bg-primary" : "hover:bg-black"
      } hover:text-cream ${className}`}
    >
      <p
        className={`font-mono text-xs tracking-[0.3em] mb-2 transition-colors ${
          isOrange ? "" : "group-hover:text-primary"
        }`}
      >
        {label}
      </p>
      <p className="text-4xl md:text-5xl font-black">
        {value}
        {suffix && (
          <span className="text-neutral-400 group-hover:text-cream transition-colors">{suffix}</span>
        )}
      </p>
    </div>
  );
}

// ViewPlanButton with CSS-only hover
function ViewPlanButton({ label }: { label: string }) {
  return (
    <div className="p-6 border-b-4 lg:border-b-0 border-black transition-colors cursor-pointer hover:bg-black hover:text-cream">
      <span className="font-black text-lg">{label}</span>
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { user } = useAuth();
  const { dashboardData, isLoading, error } = useDashboardData(user?.id);

  // Static UI content
  const motivational = locale === "ar" ? {
    reminder: "تذكير يومي",
    line1: "الاستمرارية",
    line2: "تتفوق على",
    line3: "الكمال"
  } : {
    reminder: "DAILY REMINDER",
    line1: "CONSISTENCY",
    line2: "BEATS",
    line3: "PERFECTION"
  };

  const marquee = locale === "ar"
    ? "فيت فاست • لياقة بالذكاء الاصطناعي • غير جسمك • تتبع تقدمك • فيت فاست • لياقة بالذكاء الاصطناعي • غير جسمك • تتبع تقدمك •"
    : "FITFAST • AI-POWERED FITNESS • TRANSFORM YOUR BODY • TRACK YOUR PROGRESS • FITFAST • AI-POWERED FITNESS • TRANSFORM YOUR BODY • TRACK YOUR PROGRESS •";

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="border-4 border-black bg-cream p-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="mx-auto w-12 h-12 border-4 border-black border-t-primary animate-spin mb-4" />
          <p className="font-black uppercase">{t("common.loading").toUpperCase()}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="border-4 border-black bg-cream p-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="font-black text-error-500 uppercase">ERROR LOADING DASHBOARD</p>
        </div>
      </div>
    );
  }

  // Format next check-in display
  const nextCheckInDisplay = dashboardData.nextCheckInDays !== null
    ? `${dashboardData.nextCheckInDays}D`
    : "-";

  // Get user name
  const userName = dashboardData.profile?.full_name || (locale === "ar" ? "مستخدم" : "USER");

  return (
    <div className="text-black overflow-x-hidden">
      {/* Top Banner */}
      <div className="py-2 px-4 overflow-hidden bg-black text-cream">
        <div className="animate-marquee whitespace-nowrap font-mono text-xs tracking-widest">
          {marquee}
        </div>
      </div>

      {/* Header Section */}
      <div className="border-b-4 border-black px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="font-mono text-xs tracking-[0.5em] text-neutral-500 mb-2">
              [{formatDateWithWeekday(new Date(), locale).toUpperCase()}]
            </p>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">
              {t("dashboard.welcome").toUpperCase().replace("!", "")}
              <br />
              <span className="text-primary">{userName}</span>
            </h1>
          </div>
          <div className="flex gap-8">
            <div className="text-end">
              <p className="text-6xl md:text-8xl font-black leading-none">{dashboardData.streak}</p>
              <p className="font-mono text-xs tracking-[0.3em] mt-1">{t("tracking.streakDays").toUpperCase()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="border-b-4 border-black">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4">
          <StatCard
            label={t("dashboard.mealProgress").toUpperCase()}
            value={`${dashboardData.mealProgress.completed}`}
            suffix={`/${dashboardData.mealProgress.total}`}
            hoverBg="black"
          />
          <StatCard
            label={t("dashboard.workoutProgress").toUpperCase()}
            value={`${dashboardData.workoutProgress.completed}`}
            suffix={`/${dashboardData.workoutProgress.total}`}
            hoverBg="black"
            className="border-e-0 md:border-e-4"
          />
          <StatCard
            label={t("dashboard.upcomingCheckIn").toUpperCase()}
            value={nextCheckInDisplay}
            hoverBg="black"
            className="border-t-4 md:border-t-0"
          />
          <StatCard
            label={t("progress.title").toUpperCase()}
            value={`${Math.round((dashboardData.mealProgress.completed / dashboardData.mealProgress.total) * 100)}%`}
            hoverBg="orange"
            className="border-e-0 border-t-4 md:border-t-0"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Meals Section */}
          <div className="lg:col-span-7 border-e-0 lg:border-e-4 border-black">
            <div className="border-b-4 border-black p-6">
              <h2 className="font-mono text-xs tracking-[0.5em] mb-1">{t("meals.todaysMeals").toUpperCase().split(" ")[0]}</h2>
              <h3 className="text-3xl md:text-4xl font-black">{t("nav.mealPlan").toUpperCase()}</h3>
            </div>

            {dashboardData.todaysMeals.map((meal) => (
              <div
                key={meal.id}
                className={`group border-b-4 border-black flex transition-colors cursor-pointer ${
                  meal.done ? "bg-neutral-100" : "hover:bg-primary hover:text-white"
                }`}
              >
                <div
                  className={`w-20 md:w-24 border-e-4 border-black p-4 flex items-center justify-center font-mono text-sm ${
                    meal.done ? "bg-black text-primary" : ""
                  }`}
                >
                  {meal.time}
                </div>
                <div className="flex-1 p-4 flex items-center justify-between">
                  <div>
                    <p className={`text-xl md:text-2xl font-black ${meal.done ? "line-through text-neutral-400" : ""}`}>
                      {meal.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm hidden sm:inline">{meal.calories} {locale === "ar" ? "سعرة" : "KCAL"}</span>
                    <div
                      className={`w-8 h-8 border-4 transition-colors ${
                        meal.done
                          ? "border-black bg-black"
                          : "border-black group-hover:border-white"
                      }`}
                    >
                      {meal.done && <span className="block w-full h-full bg-primary" />}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Link href="/meal-plan">
              <ViewPlanButton label={`${t("dashboard.viewPlan").toUpperCase()} ${locale === "ar" ? "←" : "→"}`} />
            </Link>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-5">
            {/* Workout Block */}
            <div className="border-b-4 border-black">
              <div className="p-6 border-b-4 border-black">
                <h2 className="font-mono text-xs tracking-[0.5em] mb-1">{t("workouts.todaysWorkout").toUpperCase().split(" ")[0]}</h2>
                <h3 className="text-3xl md:text-4xl font-black">{t("nav.workoutPlan").toUpperCase()}</h3>
              </div>
              {dashboardData.todaysWorkout ? (
                <div
                  className={cn("p-6", dashboardData.todaysWorkout.done && "bg-black text-cream")}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p
                        className={cn(
                          "font-mono text-xs tracking-[0.3em] mb-1",
                          dashboardData.todaysWorkout.done ? "text-neutral-400" : "text-neutral-500"
                        )}
                      >
                        {dashboardData.todaysWorkout.type}
                      </p>
                      <h4
                        className={cn(
                          "text-3xl md:text-4xl font-black",
                          dashboardData.todaysWorkout.done && "text-cream"
                        )}
                      >
                        {dashboardData.todaysWorkout.name}
                      </h4>
                    </div>
                    {dashboardData.todaysWorkout.done && (
                      <div className="px-3 py-1 font-mono text-xs font-bold bg-primary text-black">
                        {t("dashboard.completedToday").toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      className={cn(
                        "border-4 p-4",
                        dashboardData.todaysWorkout.done ? "border-cream" : "border-black"
                      )}
                    >
                      <p
                        className={cn(
                          "text-3xl md:text-4xl font-black",
                          dashboardData.todaysWorkout.done && "text-cream"
                        )}
                      >
                        {dashboardData.todaysWorkout.duration}
                      </p>
                      <p
                        className={cn(
                          "font-mono text-xs mt-1",
                          dashboardData.todaysWorkout.done && "text-cream"
                        )}
                      >
                        {t("workouts.duration").toUpperCase()}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "border-4 p-4",
                        dashboardData.todaysWorkout.done ? "border-cream" : "border-black"
                      )}
                    >
                      <p
                        className={cn(
                          "text-3xl md:text-4xl font-black",
                          dashboardData.todaysWorkout.done && "text-cream"
                        )}
                      >
                        {dashboardData.todaysWorkout.exercises}
                      </p>
                      <p
                        className={cn(
                          "font-mono text-xs mt-1",
                          dashboardData.todaysWorkout.done && "text-cream"
                        )}
                      >
                        {t("workouts.exercises").toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <Link href="/workout-plan">
                    <button
                      className={`w-full mt-6 py-4 font-black text-xl transition-all ${
                        dashboardData.todaysWorkout.done
                          ? "bg-cream text-black"
                          : "bg-primary text-white"
                      }`}
                    >
                      {dashboardData.todaysWorkout.done ? t("dashboard.viewPlan").toUpperCase() : t("dashboard.startWorkout").toUpperCase()} {locale === "ar" ? "←" : "→"}
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <p className="font-black text-xl text-neutral-400">{locale === "ar" ? "يوم راحة أو لا يوجد تمرين اليوم" : "REST DAY OR NO WORKOUT TODAY"}</p>
                  <Link href="/workout-plan" className="inline-block mt-4">
                    <button className="px-6 py-3 bg-black text-cream font-black text-sm uppercase">
                      {t("dashboard.viewPlan").toUpperCase()} {locale === "ar" ? "←" : "→"}
                    </button>
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2">
              <Link href="/check-in" className="border-e-4 border-b-4 border-black p-6 md:p-8 text-start hover:bg-black hover:text-cream transition-colors group">
                <ClipboardCheck className="w-10 h-10 md:w-12 md:h-12 mb-4 group-hover:animate-bounce" />
                <span className="font-black text-lg md:text-xl block">{t("checkIn.submitCheckIn").toUpperCase()}</span>
                <span className="block font-mono text-xs mt-1 text-neutral-500 group-hover:text-neutral-400">
                  {t("checkIn.title").toUpperCase()}
                </span>
              </Link>
              <Link href="/progress" className="border-b-4 border-black p-6 md:p-8 text-start hover:bg-primary hover:text-white transition-colors group">
                <TrendingUp className="w-10 h-10 md:w-12 md:h-12 mb-4 group-hover:animate-bounce" />
                <span className="font-black text-lg md:text-xl block">{t("progress.title").toUpperCase()}</span>
                <span className="block font-mono text-xs mt-1 text-neutral-500 group-hover:text-neutral-200">
                  {t("progress.weightHistory").toUpperCase()}
                </span>
              </Link>
            </div>

            {/* Motivational Block */}
            <div className="p-6 md:p-8 bg-black text-cream">
              <p className="font-mono text-xs tracking-[0.5em] mb-4 text-primary">{motivational.reminder}</p>
              <p className="text-2xl md:text-3xl font-black leading-tight">
                {motivational.line1}
                <br />
                <span className="text-primary">{motivational.line2}</span>
                <br />
                {motivational.line3}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t-4 border-black px-6 py-4 bg-black text-cream">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="font-mono text-xs tracking-[0.3em]">
            {locale === "ar" ? `فيت فاست™ ${new Date().getFullYear()} • جميع الحقوق محفوظة` : `FITFAST™ ${new Date().getFullYear()} • ALL RIGHTS RESERVED`}
          </div>
          <div className="flex gap-8 font-mono text-xs tracking-[0.2em]">
            <Link href="/faq" className="text-cream transition-colors hover:opacity-80">{t("nav.faq").toUpperCase()}</Link>
            <Link href="/settings" className="text-cream transition-colors hover:opacity-80">{t("nav.settings").toUpperCase()}</Link>
            <Link href="/tickets" className="text-cream transition-colors hover:opacity-80">{t("nav.tickets").toUpperCase()}</Link>
          </div>
        </div>
      </div>

    </div>
  );
}
