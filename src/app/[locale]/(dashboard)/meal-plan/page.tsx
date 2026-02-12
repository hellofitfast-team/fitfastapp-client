"use client";

import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentMealPlan } from "@/hooks/use-meal-plans";
import { UtensilsCrossed, Calendar, TrendingUp, CheckCircle2, RefreshCw, Clock, Flame } from "lucide-react";
import { useState } from "react";
import type { GeneratedMealPlan } from "@/lib/ai/meal-plan-generator";

export default function MealPlanPage() {
  const t = useTranslations("meals");
  const tCommon = useTranslations("common");
  const tDays = useTranslations("days");
  const locale = useLocale();
  const { user } = useAuth();
  const { mealPlan, isLoading, error } = useCurrentMealPlan(user?.id);
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
      const response = await fetch("/api/plans/meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planDuration: 14 }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate meal plan");
      }

      window.location.reload();
    } catch (err) {
      console.error("Error generating meal plan:", err);
      alert("Failed to generate meal plan. Please try again.");
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

  if (error || !mealPlan) {
    return (
      <div className="space-y-6">
        <div className="border-4 border-black bg-black p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center bg-primary">
              <UtensilsCrossed className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-cream">
                {t("title").toUpperCase()}
              </h1>
              <p className="font-mono text-xs tracking-[0.2em] text-primary">
                {t("getStarted").toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="p-12 text-center">
            <div className="inline-flex h-20 w-20 items-center justify-center bg-primary mb-6">
              <UtensilsCrossed className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-black tracking-tight">
              {t("noActivePlan").toUpperCase()}
            </h3>
            <p className="mt-3 font-mono text-xs text-neutral-500 max-w-md mx-auto">
              {t("generateDescription").toUpperCase()}
            </p>
            <button
              onClick={handleGeneratePlan}
              disabled={generatingPlan}
              className="mt-8 h-14 px-8 bg-black text-cream font-black text-lg uppercase tracking-wide hover:bg-primary disabled:opacity-50 transition-colors flex items-center gap-3 mx-auto"
            >
              {generatingPlan ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  {t("generating").toUpperCase()}
                </>
              ) : (
                <>
                  <UtensilsCrossed className="h-5 w-5" />
                  {t("generatePlan").toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const planData = mealPlan.plan_data as unknown as GeneratedMealPlan;
  const dayPlan = planData.weeklyPlan[selectedDay];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-4 border-black bg-black p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center bg-primary">
              <UtensilsCrossed className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-cream">
                {t("title").toUpperCase()}
              </h1>
              <p className="font-mono text-xs tracking-[0.2em] text-primary">
                {mealPlan.start_date} - {mealPlan.end_date}
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

      {/* Weekly Overview */}
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-primary p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-black">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-black text-xl text-white tracking-tight">
              {t("weeklyOverview").toUpperCase()}
            </h2>
            <p className="font-mono text-xs text-white/80">{t("nutritionSummary").toUpperCase()}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4">
          <div className="p-6 text-center border-e-4 border-b-4 sm:border-b-0 border-black">
            <p className="text-4xl font-black text-primary">{planData.weeklyTotals.calories}</p>
            <p className="font-bold text-sm text-neutral-500 mt-1">{t("calories").toUpperCase()}</p>
          </div>
          <div className="p-6 text-center border-b-4 sm:border-b-0 sm:border-e-4 border-black">
            <p className="text-4xl font-black">{planData.weeklyTotals.protein}g</p>
            <p className="font-bold text-sm text-neutral-500 mt-1">{t("protein").toUpperCase()}</p>
          </div>
          <div className="p-6 text-center border-e-4 border-black">
            <p className="text-4xl font-black">{planData.weeklyTotals.carbs}g</p>
            <p className="font-bold text-sm text-neutral-500 mt-1">{t("carbs").toUpperCase()}</p>
          </div>
          <div className="p-6 text-center">
            <p className="text-4xl font-black">{planData.weeklyTotals.fat}g</p>
            <p className="font-bold text-sm text-neutral-500 mt-1">{t("fat").toUpperCase()}</p>
          </div>
        </div>
      </div>

      {/* Day Selector */}
      <div className="flex gap-0 overflow-x-auto pb-2">
        {weekDays.map((day, index) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`flex-1 min-w-[80px] p-3 border-4 border-black -ms-1 first:ms-0 font-black text-sm transition-colors ${
              selectedDay === day
                ? "bg-black text-primary z-10"
                : "bg-cream text-black hover:bg-neutral-100"
            }`}
          >
            {/* Show short day name for English, full name for Arabic */}
            {locale === "ar" ? tDays(day as any) : tDays((day.slice(0, 3)) as any)}
          </button>
        ))}
      </div>

      {/* Daily Meals */}
      {dayPlan && (
        <>
          {/* Daily Totals */}
          <div className="border-4 border-black bg-primary p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Flame className="h-6 w-6 text-white" />
                <span className="font-black text-white uppercase">{t("dailyTotals").toUpperCase()}</span>
              </div>
              <div className="flex flex-wrap gap-6 text-white font-bold text-base">
                <span>{dayPlan.dailyTotals.calories} {t("calories").toUpperCase()}</span>
                <span>{dayPlan.dailyTotals.protein}g {t("protein").toUpperCase()}</span>
                <span>{dayPlan.dailyTotals.carbs}g {t("carbs").toUpperCase()}</span>
                <span>{dayPlan.dailyTotals.fat}g {t("fat").toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Meals */}
          <div className="space-y-0">
            {dayPlan.meals.map((meal, index) => (
              <div key={index} className="border-4 border-black -mt-1 first:mt-0 bg-cream">
                <div className="border-b-4 border-black bg-neutral-100 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center bg-black font-black text-sm text-cream">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <h3 className="font-black text-lg tracking-tight">{meal.name.toUpperCase()}</h3>
                      <div className="flex items-center gap-2 font-bold text-sm text-neutral-500">
                        <Clock className="h-4 w-4" />
                        {meal.time}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-primary">{meal.calories} {t("kcal").toUpperCase()}</span>
                    <button
                      className="h-10 w-10 border-4 border-black bg-cream hover:bg-primary hover:text-cream transition-colors flex items-center justify-center"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Macros */}
                  <div className="flex flex-wrap gap-3 font-bold text-sm">
                    <span className="px-3 py-1.5 border-2 border-black bg-neutral-100">
                      {t("protein").toUpperCase()}: {meal.protein}g
                    </span>
                    <span className="px-3 py-1.5 border-2 border-black bg-neutral-100">
                      {t("carbs").toUpperCase()}: {meal.carbs}g
                    </span>
                    <span className="px-3 py-1.5 border-2 border-black bg-neutral-100">
                      {t("fat").toUpperCase()}: {meal.fat}g
                    </span>
                  </div>

                  {/* Ingredients */}
                  <div>
                    <h4 className="font-black text-base uppercase mb-2">{t("ingredients")}</h4>
                    <div className="border-4 border-black bg-neutral-50 p-4">
                      <ul className="space-y-2 font-semibold text-base">
                        {meal.ingredients.map((ingredient, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="font-black text-primary">•</span>
                            {ingredient}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div>
                    <h4 className="font-black text-base uppercase mb-2">{t("instructions")}</h4>
                    <div className="border-4 border-black bg-neutral-50 p-4">
                      <ol className="space-y-3 font-semibold text-base">
                        {meal.instructions.map((instruction, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-black font-black text-sm text-cream">
                              {i + 1}
                            </span>
                            {instruction}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Alternatives */}
                  {meal.alternatives && meal.alternatives.length > 0 && (
                    <div>
                      <h4 className="font-black text-base uppercase mb-2">{t("alternatives")}</h4>
                      <div className="border-4 border-dashed border-black bg-primary/10 p-4">
                        <ul className="space-y-2 font-semibold text-base">
                          {meal.alternatives.map((alt, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="font-black text-primary">↔</span>
                              {alt}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Notes */}
      {planData.notes && (
        <div className="border-4 border-black bg-black text-cream p-6">
          <p className="font-mono text-xs tracking-[0.2em] text-primary mb-2">{t("coachNotes").toUpperCase()}</p>
          <p className="font-mono text-sm">{planData.notes}</p>
        </div>
      )}
    </div>
  );
}
