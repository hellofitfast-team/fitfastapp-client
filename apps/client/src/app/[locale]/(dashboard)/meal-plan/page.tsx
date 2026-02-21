"use client";

import { useTranslations, useLocale } from "next-intl";
import { useCurrentMealPlan } from "@/hooks/use-meal-plans";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { UtensilsCrossed, Calendar, TrendingUp, RefreshCw, Clock, Flame, Loader2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@fitfast/ui/cn";
import { usePlanStream } from "@/hooks/use-plan-stream";
import type { GeneratedMealPlan } from "@/lib/ai/meal-plan-generator";

export default function MealPlanPage() {
  const t = useTranslations("meals");
  const tCommon = useTranslations("common");
  const tDays = useTranslations("days");
  const locale = useLocale();
  const { profile } = useAuth();
  const { mealPlan, isLoading, error } = useCurrentMealPlan();
  const [selectedDay, setSelectedDay] = useState("monday");
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<number | null>(0);

  const generateMealPlan = useAction(api.ai.generateMealPlan);

  // Streaming support — show live AI text while plan generates
  const streamId = mealPlan?.streamId;
  const { streamedText, isStreaming } = usePlanStream(
    // Only stream if plan exists but has no parsed data yet
    mealPlan && (!mealPlan.planData || (mealPlan.planData as any)?.parseError)
      ? streamId
      : undefined,
  );

  const weekDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  const handleGeneratePlan = async () => {
    setGeneratingPlan(true);
    try {
      await generateMealPlan({
        language: (profile?.language || "en") as "en" | "ar",
        planDuration: 14,
      });
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
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  // Show streaming banner while AI generates the plan
  if (mealPlan && isStreaming && streamedText) {
    return (
      <div className="px-4 py-6 space-y-5 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("generating")}</p>
        </div>
        <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-[#10B981] animate-pulse" />
            <span className="text-sm font-semibold text-[#10B981]">
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

  if (error || !mealPlan) {
    return (
      <div className="px-4 py-6 space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("getStarted")}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-10 text-center shadow-card">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-[#10B981]/12 mb-4">
            <UtensilsCrossed className="h-8 w-8 text-[#10B981]" />
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
              <><UtensilsCrossed className="h-4 w-4" />{t("generatePlan")}</>
            )}
          </button>
        </div>
      </div>
    );
  }

  const planData = mealPlan.planData as unknown as GeneratedMealPlan;
  const dayPlan = planData.weeklyPlan[selectedDay];

  return (
    <div className="px-4 py-6 space-y-5 max-w-3xl mx-auto lg:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {mealPlan.startDate} - {mealPlan.endDate}
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

      {/* Weekly Overview */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-border bg-[#10B981]/8">
          <TrendingUp className="h-4 w-4 text-[#10B981]" />
          <h2 className="font-semibold text-sm">{t("weeklyOverview")}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border">
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-[#10B981]">{planData.weeklyTotals.calories}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("calories")}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold">{planData.weeklyTotals.protein}g</p>
            <p className="text-xs text-muted-foreground mt-1">{t("protein")}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold">{planData.weeklyTotals.carbs}g</p>
            <p className="text-xs text-muted-foreground mt-1">{t("carbs")}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold">{planData.weeklyTotals.fat}g</p>
            <p className="text-xs text-muted-foreground mt-1">{t("fat")}</p>
          </div>
        </div>
      </div>

      {/* Day Selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {weekDays.map((day) => (
          <button
            key={day}
            onClick={() => { setSelectedDay(day); setExpandedMeal(0); }}
            className={cn(
              "flex-shrink-0 min-w-[56px] px-3 py-2 rounded-lg text-xs font-semibold transition-colors",
              selectedDay === day
                ? "bg-[#10B981] text-white"
                : "bg-neutral-100 text-muted-foreground hover:bg-neutral-200"
            )}
          >
            {locale === "ar" ? tDays(day as any) : tDays((day.slice(0, 3)) as any)}
          </button>
        ))}
      </div>

      {/* Daily Meals */}
      {dayPlan && (
        <>
          {/* Daily Totals */}
          <div className="rounded-lg bg-[#10B981]/8 border border-[#10B981]/20 p-3.5 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-[#10B981]" />
              <span className="text-sm font-semibold">{t("dailyTotals")}</span>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span>{dayPlan.dailyTotals.calories} {t("calories")}</span>
              <span>{dayPlan.dailyTotals.protein}g {t("protein")}</span>
              <span>{dayPlan.dailyTotals.carbs}g {t("carbs")}</span>
              <span>{dayPlan.dailyTotals.fat}g {t("fat")}</span>
            </div>
          </div>

          {/* Meals */}
          <div className="space-y-3">
            {dayPlan.meals.map((meal, index) => (
              <div key={index} className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                {/* Meal Header -- tap to expand */}
                <button
                  onClick={() => setExpandedMeal(expandedMeal === index ? null : index)}
                  className="w-full p-4 flex items-center justify-between gap-3 text-start hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#10B981]/12 text-[#10B981] text-xs font-bold">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{meal.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3" />
                        {meal.time}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-[#10B981]">{meal.calories} {t("kcal")}</span>
                    {expandedMeal === index ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {expandedMeal === index && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                    {/* Macros */}
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium">
                        {t("protein")}: {meal.protein}g
                      </span>
                      <span className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium">
                        {t("carbs")}: {meal.carbs}g
                      </span>
                      <span className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium">
                        {t("fat")}: {meal.fat}g
                      </span>
                    </div>

                    {/* Ingredients */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">{t("ingredients")}</h4>
                      <div className="rounded-lg bg-neutral-50 p-3">
                        <ul className="space-y-1.5 text-sm">
                          {meal.ingredients.map((ingredient, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-[#10B981] mt-0.5">•</span>
                              {ingredient}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">{t("instructions")}</h4>
                      <div className="rounded-lg bg-neutral-50 p-3">
                        <ol className="space-y-2 text-sm">
                          {meal.instructions.map((instruction, i) => (
                            <li key={i} className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#10B981]/12 text-[#10B981] text-[10px] font-bold mt-0.5">
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
                        <h4 className="text-sm font-semibold mb-2">{t("alternatives")}</h4>
                        <div className="rounded-lg border border-dashed border-[#10B981]/30 bg-[#10B981]/5 p-3">
                          <ul className="space-y-1.5 text-sm">
                            {meal.alternatives.map((alt, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-[#10B981]">↔</span>
                                {alt}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Notes */}
      {planData.notes && (
        <div className="rounded-xl bg-neutral-50 border border-border p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1">{t("coachNotes")}</p>
          <p className="text-sm">{planData.notes}</p>
        </div>
      )}
    </div>
  );
}
