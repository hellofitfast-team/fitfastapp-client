"use client";

import { useTranslations, useLocale } from "next-intl";
import { useCurrentMealPlan } from "@/hooks/use-meal-plans";
import { UtensilsCrossed, TrendingUp, RefreshCw, Clock, Flame, Loader2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { cn } from "@fitfast/ui/cn";
import { usePlanStream } from "@/hooks/use-plan-stream";
import { EmptyState } from "@fitfast/ui/empty-state";
import { DaySelector } from "./_components/day-selector";
import type { GeneratedMealPlan } from "@/lib/ai/meal-plan-generator";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@fitfast/ui/button";
import { useAuth } from "@/hooks/use-auth";

// Normalize a meal object to handle both old format (macros nested in .macros)
// and new format (flat calories/protein/carbs/fat)
function normalizeMeal(raw: any) {
  const macros = raw.macros || {};
  return {
    name: raw.name || "",
    type: raw.type || "",
    calories: raw.calories ?? macros.calories ?? 0,
    protein: raw.protein ?? macros.protein ?? 0,
    carbs: raw.carbs ?? macros.carbs ?? 0,
    fat: raw.fat ?? macros.fat ?? 0,
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
    instructions: Array.isArray(raw.instructions)
      ? raw.instructions
      : typeof raw.instructions === "string"
        ? raw.instructions.split(/\.\s+/).filter(Boolean)
        : [],
    alternatives: Array.isArray(raw.alternatives) ? raw.alternatives : [],
  };
}

// Resolve the day plan from weeklyPlan — tries "dayN" format first, then weekday names
function resolveDayPlan(weeklyPlan: Record<string, any>, dayIndex: number, startDate?: string) {
  // Try new format: "day1", "day2", ...
  const dayKey = `day${dayIndex + 1}`;
  if (weeklyPlan[dayKey]) return weeklyPlan[dayKey];

  // Try old format: weekday name based on startDate + offset
  if (startDate) {
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayIndex);
    const weekdayName = dayNames[date.getDay()];
    if (weeklyPlan[weekdayName]) return weeklyPlan[weekdayName];
  }

  return null;
}

export default function MealPlanPage() {
  const t = useTranslations("meals");
  const tCommon = useTranslations("common");
  const tEmpty = useTranslations("emptyStates");
  const locale = useLocale();
  const { mealPlan, isLoading, error } = useCurrentMealPlan();
  const [selectedDay, setSelectedDay] = useState(0);
  const [expandedMeal, setExpandedMeal] = useState<number | null>(0);
  const [expandedAlts, setExpandedAlts] = useState<Set<string>>(new Set());
  const daySelectorRef = useRef<HTMLDivElement>(null);
  const isRTL = locale === "ar";
  const { profile } = useAuth();

  // Generate meal plan action + plan duration config
  const generateMealPlan = useAction(api.ai.generateMealPlan);
  const frequencyConfig = useQuery(api.systemConfig.getConfig, { key: "check_in_frequency_days" });
  const planDuration = typeof frequencyConfig?.value === "number"
    ? frequencyConfig.value
    : Number(frequencyConfig?.value) || 14;
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const language = (profile?.language || locale || "en") as "en" | "ar";
      await generateMealPlan({ language, planDuration, isInitialGeneration: true });
    } catch (err) {
      console.error("Meal plan generation failed:", err);
      setGenerateError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

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

  // Streaming support
  const streamId = mealPlan?.streamId;
  const { streamedText, isStreaming } = usePlanStream(
    mealPlan && (!mealPlan.planData || (mealPlan.planData as any)?.parseError)
      ? streamId
      : undefined,
  );

  // Compute today's day index from plan start date
  const maxDayIndex = mealPlan?.startDate && mealPlan?.endDate
    ? Math.ceil((new Date(mealPlan.endDate).getTime() - new Date(mealPlan.startDate).getTime()) / 86400000) - 1
    : 13;
  const todayDayIndex = useMemo(() => {
    if (!mealPlan?.startDate) return 0;
    const start = new Date(mealPlan.startDate);
    const diff = Math.floor((Date.now() - start.getTime()) / 86400000);
    return Math.max(0, Math.min(maxDayIndex, diff));
  }, [mealPlan?.startDate, maxDayIndex]);

  // Auto-select today on mount
  useEffect(() => {
    if (mealPlan?.startDate) {
      setSelectedDay(todayDayIndex);
    }
  }, [todayDayIndex, mealPlan?.startDate]);

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

  // Show streaming banner while AI generates (only if planData not yet parsed)
  if (mealPlan && isStreaming && streamedText && !mealPlan.planData) {
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
          description={isGenerating ? t("generating") : tEmpty("noMealPlan.description")}
        />
        {generateError && (
          <div className="rounded-lg border border-error-500/30 bg-error-500/10 p-3 text-center">
            <p className="text-sm text-error-500">{generateError}</p>
          </div>
        )}
        <div className="flex justify-center">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            loading={isGenerating}
            variant="gradient"
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating ? t("generating") : t("generatePlan")}
          </Button>
        </div>
      </div>
    );
  }

  const planData = mealPlan.planData as unknown as GeneratedMealPlan;

  // Guard: if weeklyPlan is missing, show empty state instead of crashing
  if (!planData?.weeklyPlan) {
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
        />
      </div>
    );
  }

  const totalDays = mealPlan.startDate && mealPlan.endDate
    ? Math.ceil((new Date(mealPlan.endDate).getTime() - new Date(mealPlan.startDate).getTime()) / 86400000)
    : 14;
  const dayPlan = resolveDayPlan(planData.weeklyPlan, selectedDay, mealPlan.startDate);

  // Normalize meals to handle both old (nested macros) and new (flat) formats
  const rawMeals = dayPlan?.meals ?? [];
  const meals = rawMeals.map(normalizeMeal);
  const dailyTotals = dayPlan ? {
    calories: dayPlan.dailyTotals?.calories ?? meals.reduce((sum: number, m: any) => sum + (m.calories || 0), 0),
    protein: dayPlan.dailyTotals?.protein ?? meals.reduce((sum: number, m: any) => sum + (m.protein || 0), 0),
    carbs: dayPlan.dailyTotals?.carbs ?? meals.reduce((sum: number, m: any) => sum + (m.carbs || 0), 0),
    fat: dayPlan.dailyTotals?.fat ?? meals.reduce((sum: number, m: any) => sum + (m.fat || 0), 0),
  } : null;

  return (
    <div className="px-4 py-6 space-y-5 max-w-3xl mx-auto lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {mealPlan.startDate} - {mealPlan.endDate}
        </p>
      </div>

      {/* Day Selector (1-14) */}
      <DaySelector
        totalDays={totalDays}
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
          {meals.map((meal: any, index: number) => {
            const isExpanded = expandedMeal === index;
            const hasAlternatives = Array.isArray(meal.alternatives) && meal.alternatives.length > 0;

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
                          {(Array.isArray(meal.ingredients) ? meal.ingredients : []).map((ingredient: string, i: number) => (
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
                          {(Array.isArray(meal.instructions) ? meal.instructions : []).map((instruction: string, i: number) => (
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
                        <div className="rounded-lg border border-dashed border-[#10B981]/30 bg-[#10B981]/5 p-3 space-y-1.5">
                          {meal.alternatives!.map((alt: any, i: number) => {
                            if (typeof alt === "string") {
                              // Old format: plain string
                              return (
                                <div key={i} className="flex items-start gap-2 text-sm">
                                  <span className="text-[#10B981]">&#8596;</span>
                                  {alt}
                                </div>
                              );
                            }

                            // New format: detailed alternative object
                            const altKey = `${index}-${i}`;
                            const isAltExpanded = expandedAlts.has(altKey);
                            const toggleAlt = () => {
                              setExpandedAlts((prev) => {
                                const next = new Set(prev);
                                if (next.has(altKey)) {
                                  next.delete(altKey);
                                } else {
                                  next.add(altKey);
                                }
                                return next;
                              });
                            };
                            const normalizedAlt = normalizeMeal(alt);

                            return (
                              <div key={i} className="rounded-md border border-[#10B981]/20 bg-white/60 overflow-hidden">
                                {/* Collapsed header */}
                                <button
                                  onClick={toggleAlt}
                                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-start hover:bg-[#10B981]/5 transition-colors"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[#10B981] text-sm shrink-0">&#8596;</span>
                                    <span className="text-sm font-medium truncate">{normalizedAlt.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="rounded-full bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 text-[10px] font-semibold">
                                      {normalizedAlt.calories} {t("kcal")}
                                    </span>
                                    <ChevronDown className={cn(
                                      "h-3.5 w-3.5 text-[#10B981]/60 transition-transform duration-150",
                                      isAltExpanded && "rotate-180"
                                    )} />
                                  </div>
                                </button>

                                {/* Expanded body */}
                                <div className={cn(
                                  "overflow-hidden transition-all duration-150",
                                  isAltExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                                )}>
                                  <div className="px-3 pb-3 pt-2 space-y-3 border-t border-[#10B981]/15">
                                    {/* Macro chips */}
                                    <div className="flex flex-wrap gap-1.5">
                                      <span className="rounded-md bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 text-[10px] font-medium">
                                        {t("protein")}: {normalizedAlt.protein}g
                                      </span>
                                      <span className="rounded-md bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 text-[10px] font-medium">
                                        {t("carbs")}: {normalizedAlt.carbs}g
                                      </span>
                                      <span className="rounded-md bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 text-[10px] font-medium">
                                        {t("fat")}: {normalizedAlt.fat}g
                                      </span>
                                    </div>

                                    {/* Ingredients */}
                                    {normalizedAlt.ingredients.length > 0 && (
                                      <div>
                                        <h5 className="text-xs font-semibold mb-1 text-muted-foreground">{t("ingredients")}</h5>
                                        <ul className="space-y-1 text-xs">
                                          {normalizedAlt.ingredients.map((ingredient: string, j: number) => (
                                            <li key={j} className="flex items-start gap-1.5">
                                              <span className="text-[#10B981] mt-0.5">&#8226;</span>
                                              {ingredient}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Instructions */}
                                    {normalizedAlt.instructions.length > 0 && (
                                      <div>
                                        <h5 className="text-xs font-semibold mb-1 text-muted-foreground">{t("instructions")}</h5>
                                        <ol className="space-y-1 text-xs">
                                          {normalizedAlt.instructions.map((instruction: string, j: number) => (
                                            <li key={j} className="flex items-start gap-1.5">
                                              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#10B981]/12 text-[#10B981] text-[9px] font-bold mt-0.5">
                                                {j + 1}
                                              </span>
                                              {instruction}
                                            </li>
                                          ))}
                                        </ol>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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
