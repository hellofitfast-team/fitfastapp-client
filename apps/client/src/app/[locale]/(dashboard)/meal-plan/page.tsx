"use client";

import { useTranslations, useLocale } from "next-intl";
import { useCurrentMealPlan } from "@/hooks/use-meal-plans";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { UtensilsCrossed, Calendar, TrendingUp, RefreshCw, Clock, Flame, Loader2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { cn } from "@fitfast/ui/cn";
import { usePlanStream } from "@/hooks/use-plan-stream";
import { EmptyState } from "@fitfast/ui/empty-state";
import { DaySelector } from "./_components/day-selector";
import type { GeneratedMealPlan } from "@/lib/ai/meal-plan-generator";

export default function MealPlanPage() {
  const t = useTranslations("meals");
  const tCommon = useTranslations("common");
  const tEmpty = useTranslations("emptyStates");
  const locale = useLocale();
  const { profile } = useAuth();
  const { mealPlan, isLoading, error } = useCurrentMealPlan();
  const [selectedDay, setSelectedDay] = useState(0);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<number | null>(0);
  const daySelectorRef = useRef<HTMLDivElement>(null);
  const isRTL = locale === "ar";

  // Scroll day selector to show day 1 on the correct edge for RTL
  useEffect(() => {
    const el = daySelectorRef.current;
    if (!el) return;
    if (isRTL) {
      // In RTL, scroll to the end so day 1 appears on the right edge
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    }
  }, [isRTL]);

  // Scroll selected day into view
  useEffect(() => {
    const el = daySelectorRef.current;
    if (!el) return;
    const activeBtn = el.querySelector("[data-active='true']");
    if (activeBtn) {
      activeBtn.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
    }
  }, [selectedDay]);

  const generateMealPlan = useAction(api.ai.generateMealPlan);

  // Streaming support
  const streamId = mealPlan?.streamId;
  const { streamedText, isStreaming } = usePlanStream(
    mealPlan && (!mealPlan.planData || (mealPlan.planData as any)?.parseError)
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
    if (!mealPlan?.startDate) return 0;
    const start = new Date(mealPlan.startDate);
    const diff = Math.floor((Date.now() - start.getTime()) / 86400000);
    return Math.max(0, Math.min(13, diff));
  }, [mealPlan?.startDate]);

  // Auto-select today on mount
  useState(() => {
    if (mealPlan?.startDate) {
      setSelectedDay(todayDayIndex);
    }
  });

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

  // Show streaming banner while AI generates
  if (mealPlan && isStreaming && streamedText) {
    return (
      <div className="px-4 py-6 space-y-5 max-w-3xl mx-auto lg:px-6">
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
      <div className="px-4 py-6 space-y-6 max-w-3xl mx-auto lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("getStarted")}</p>
        </div>
        <EmptyState
          icon={UtensilsCrossed}
          title={tEmpty("noMealPlan.title")}
          description={tEmpty("noMealPlan.description")}
          action={{
            label: tEmpty("noMealPlan.action"),
            onClick: handleGeneratePlan,
          }}
        />
      </div>
    );
  }

  const planData = mealPlan.planData as unknown as GeneratedMealPlan;
  const dayName = getDayName(selectedDay);
  const dayPlan = planData.weeklyPlan[dayName];

  // Compute daily nutrition totals
  const dailyTotals = dayPlan ? {
    calories: dayPlan.dailyTotals?.calories ?? dayPlan.meals.reduce((sum, m) => sum + (m.calories || 0), 0),
    protein: dayPlan.dailyTotals?.protein ?? dayPlan.meals.reduce((sum, m) => sum + (m.protein || 0), 0),
    carbs: dayPlan.dailyTotals?.carbs ?? dayPlan.meals.reduce((sum, m) => sum + (m.carbs || 0), 0),
    fat: dayPlan.dailyTotals?.fat ?? dayPlan.meals.reduce((sum, m) => sum + (m.fat || 0), 0),
  } : null;

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

      {/* Day Selector (1-14) */}
      <DaySelector
        totalDays={14}
        selectedDay={selectedDay}
        onSelectDay={(day) => { setSelectedDay(day); setExpandedMeal(0); }}
        planStartDate={mealPlan.startDate}
        featureColor="nutrition"
      />

      {/* Daily Nutrition Summary */}
      {dailyTotals && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <span className="rounded-full bg-[#10B981]/10 text-[#10B981] px-3 py-1.5 text-xs font-semibold flex-shrink-0">
            {dailyTotals.calories} {t("calories")}
          </span>
          <span className="rounded-full bg-[#10B981]/10 text-[#10B981] px-3 py-1.5 text-xs font-semibold flex-shrink-0">
            {dailyTotals.protein}g {t("protein")}
          </span>
          <span className="rounded-full bg-[#10B981]/10 text-[#10B981] px-3 py-1.5 text-xs font-semibold flex-shrink-0">
            {dailyTotals.carbs}g {t("carbs")}
          </span>
          <span className="rounded-full bg-[#10B981]/10 text-[#10B981] px-3 py-1.5 text-xs font-semibold flex-shrink-0">
            {dailyTotals.fat}g {t("fat")}
          </span>
        </div>
      )}

      {/* Meals */}
      {dayPlan && (
        <div className="space-y-3">
          {dayPlan.meals.map((meal, index) => {
            const isExpanded = expandedMeal === index;
            const hasAlternatives = meal.alternatives && meal.alternatives.length > 0;

            return (
              <div
                key={index}
                className="rounded-xl border border-border bg-card shadow-card overflow-hidden animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Meal Header */}
                <button
                  onClick={() => setExpandedMeal(isExpanded ? null : index)}
                  className="w-full p-4 flex items-center justify-between gap-3 text-start hover:bg-neutral-50 transition-colors active:scale-[0.97]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#10B981]/12 text-[#10B981] text-xs font-bold">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{meal.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {meal.ingredients?.slice(0, 3).join(", ")}
                        {(meal.ingredients?.length ?? 0) > 3 && "..."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {hasAlternatives && (
                      <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">
                        &#8596; {meal.alternatives!.length}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-[#10B981]">{meal.calories} {t("kcal")}</span>
                    <ChevronDown className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )} />
                  </div>
                </button>

                {/* Expanded Content */}
                <div className={cn(
                  "overflow-hidden transition-all duration-200 ease-in-out",
                  isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                )}>
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
                              <span className="text-[#10B981] mt-0.5">&#8226;</span>
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
                    {hasAlternatives && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">{t("alternatives")}</h4>
                        <div className="rounded-lg border border-dashed border-[#10B981]/30 bg-[#10B981]/5 p-3">
                          <ul className="space-y-1.5 text-sm">
                            {meal.alternatives!.map((alt, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-[#10B981]">&#8596;</span>
                                {alt}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
