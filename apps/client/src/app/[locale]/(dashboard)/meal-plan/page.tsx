"use client";

import { useTranslations, useLocale } from "next-intl";
import { toLocalDigits, formatDateShort } from "@/lib/utils";
import { useCurrentMealPlan } from "@/hooks/use-meal-plans";
import { UtensilsCrossed, Loader2, ChevronDown, Sparkles, Info } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { cn } from "@fitfast/ui/cn";
import { usePlanStream } from "@/hooks/use-plan-stream";
import { EmptyState } from "@fitfast/ui/empty-state";
import { DayNavigator } from "./_components/day-navigator";
import type { GeneratedMealPlan } from "@/lib/ai/meal-plan-generator";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@fitfast/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeftRight } from "lucide-react";

/** Normalized meal with flat macros (handles both old nested and new flat formats) */
interface NormalizedMeal {
  name: string;
  type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  instructions: string[];
  alternatives: (string | RawMeal)[];
}

/** Raw meal from AI output — may have nested macros or flat fields */
interface RawMeal {
  name?: string;
  type?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  macros?: { calories?: number; protein?: number; carbs?: number; fat?: number };
  ingredients?: unknown[] | string;
  instructions?: unknown[] | string;
  alternatives?: (string | RawMeal)[];
}

/** Coerce an ingredient/instruction to a plain string (handles {item,quantity} objects from Gemini) */
function toStringItem(val: unknown): string {
  if (typeof val === "string") return val;
  if (val && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    // Gemini format: {item: "chicken breast", quantity: "200g"}
    if (obj.item) return obj.quantity ? `${obj.quantity} ${obj.item}` : String(obj.item);
    // Generic: {name: "...", amount: "..."}
    if (obj.name) return obj.amount ? `${obj.amount} ${obj.name}` : String(obj.name);
    // Fallback: join all values
    return Object.values(obj).filter(Boolean).join(" ");
  }
  return String(val ?? "");
}

/** Day plan structure from AI-generated meal plan */
interface MealDayPlan {
  meals?: RawMeal[];
  dailyTotals?: { calories?: number; protein?: number; carbs?: number; fat?: number };
}

// Normalize a meal object to handle both old format (macros nested in .macros)
// and new format (flat calories/protein/carbs/fat)
function normalizeMeal(raw: RawMeal): NormalizedMeal {
  const macros = raw.macros || {};
  return {
    name: raw.name || "",
    type: raw.type || "",
    calories: raw.calories ?? macros.calories ?? 0,
    protein: raw.protein ?? macros.protein ?? 0,
    carbs: raw.carbs ?? macros.carbs ?? 0,
    fat: raw.fat ?? macros.fat ?? 0,
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients.map(toStringItem) : [],
    instructions: Array.isArray(raw.instructions)
      ? raw.instructions.map(toStringItem)
      : typeof raw.instructions === "string"
        ? raw.instructions.split(/\.\s+/).filter(Boolean)
        : [],
    alternatives: Array.isArray(raw.alternatives) ? raw.alternatives : [],
  };
}

// Resolve the day plan from weeklyPlan — tries "dayN" format first, then weekday names
function resolveDayPlan(
  weeklyPlan: Record<string, MealDayPlan>,
  dayIndex: number,
  startDate?: string,
): MealDayPlan | null {
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
  const tUnits = useTranslations("units");
  const locale = useLocale();
  const { mealPlan, isLoading, error } = useCurrentMealPlan();
  const assessment = useQuery(api.assessments.getMyAssessment);
  const [selectedDay, setSelectedDay] = useState(0);
  const [expandedMeal, setExpandedMeal] = useState<number | null>(0);
  const [expandedAlts, setExpandedAlts] = useState<Set<string>>(new Set());
  const { profile } = useAuth();

  // Translation: detect locale mismatch and auto-translate
  const requestTranslation = useAction(api.mealPlans.requestTranslation);
  const translationRequested = useRef(false);
  const planLanguage = mealPlan?.language;
  const needsTranslation = !!mealPlan && !!planLanguage && planLanguage !== locale;
  const hasTranslation =
    needsTranslation && mealPlan?.translatedLanguage === locale && !!mealPlan?.translatedPlanData;

  useEffect(() => {
    if (needsTranslation && !hasTranslation && !translationRequested.current) {
      translationRequested.current = true;
      requestTranslation({ targetLanguage: locale as "en" | "ar" }).catch(console.error);
    }
  }, [needsTranslation, hasTranslation, locale, requestTranslation]);

  // Reset translation ref when plan changes
  useEffect(() => {
    translationRequested.current = false;
  }, [mealPlan?._id]);

  // Meal swap mutation
  const swapMeal = useMutation(api.mealPlans.swapMeal);
  const [swappingKey, setSwappingKey] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  // Generate meal plan action + plan duration config
  const generateMealPlan = useAction(api.ai.generateMealPlan);
  const frequencyConfig = useQuery(api.systemConfig.getConfig, { key: "check_in_frequency_days" });
  const rawDuration =
    typeof frequencyConfig?.value === "number"
      ? frequencyConfig.value
      : Number(frequencyConfig?.value) || 10;
  const planDuration = rawDuration > 0 ? rawDuration : 10;
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generationTimedOut, setGenerationTimedOut] = useState(false);

  // Show timeout message if generating state persists for 5 minutes
  const isPlansGenerating = !mealPlan && !!assessment && !error;
  useEffect(() => {
    if (!isPlansGenerating && !isGenerating) {
      setGenerationTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setGenerationTimedOut(true), 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [isPlansGenerating, isGenerating]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const language = (locale === "ar" ? "ar" : "en") as "en" | "ar";
      await generateMealPlan({ language, planDuration, isInitialGeneration: true });
    } catch (err) {
      console.error("Meal plan generation failed:", err); // Sentry captures this
      setGenerateError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  // Streaming support
  const streamId = mealPlan?.streamId;
  const streamArg =
    mealPlan && (!mealPlan.planData || (mealPlan.planData as Record<string, unknown>)?.parseError)
      ? streamId
      : undefined;
  const { streamedText, isStreaming, parsedDays } = usePlanStream(streamArg);

  // Compute today's day index from plan start date
  const maxDayIndex =
    mealPlan?.startDate && mealPlan?.endDate
      ? Math.ceil(
          (new Date(mealPlan.endDate).getTime() - new Date(mealPlan.startDate).getTime()) /
            86400000,
        ) - 1
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
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  // Show progressive streaming view while AI generates (only if planData not yet parsed)
  if (mealPlan && isStreaming && streamedText && !mealPlan.planData) {
    const streamingDayKeys = Array.from(parsedDays.keys()).sort();
    const hasAnyDays = streamingDayKeys.length > 0;

    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{t("generating")}</p>
        </div>

        {/* Show parsed days as real meal cards */}
        {hasAnyDays &&
          streamingDayKeys.map((dayKey) => {
            const dayData = parsedDays.get(dayKey) as MealDayPlan | undefined;
            if (!dayData?.meals) return null;
            const dayNumber = dayKey.replace("day", "");
            const dayMeals = (dayData.meals ?? []).map(normalizeMeal);

            return (
              <div key={dayKey} className="space-y-2">
                <h2 className="text-sm font-semibold text-stone-600">
                  {t("dayLabel", { n: dayNumber })}
                </h2>
                {dayMeals.map((meal, idx) => (
                  <div key={idx} className="bg-card border-border rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{meal.name}</h3>
                      <span className="text-nutrition text-sm font-semibold">
                        {toLocalDigits(meal.calories, locale)} {t("kcal")}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {meal.ingredients.slice(0, 3).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            );
          })}

        {/* Generating indicator */}
        <div className="border-nutrition/30 bg-nutrition/5 rounded-xl border p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="text-nutrition h-4 w-4 animate-pulse" />
            <span className="text-nutrition text-sm font-semibold">
              {t("generatingDay", { day: String(streamingDayKeys.length + 1) })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !mealPlan) {
    // Check if plans are being generated (assessment exists but no plan yet)
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("getStarted")}</p>
        </div>
        {isPlansGenerating || isGenerating ? (
          <div className="border-border bg-card space-y-4 rounded-xl border p-8 text-center">
            {generationTimedOut ? (
              <>
                <Info className="text-warning mx-auto h-10 w-10" />
                <h2 className="text-lg font-bold">{tEmpty("mealPlanGenerating.timeoutTitle")}</h2>
                <p className="text-muted-foreground mx-auto max-w-md text-sm">
                  {tEmpty("mealPlanGenerating.timeoutDescription")}
                </p>
              </>
            ) : (
              <>
                <Loader2 className="text-primary mx-auto h-10 w-10 animate-spin" />
                <h2 className="text-lg font-bold">{tEmpty("mealPlanGenerating.title")}</h2>
                <p className="text-muted-foreground mx-auto max-w-md text-sm">
                  {tEmpty("mealPlanGenerating.description")}
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <EmptyState
              icon={UtensilsCrossed}
              title={tEmpty("noMealPlan.title")}
              description={tEmpty("noMealPlan.description")}
            />
            {generateError && (
              <div className="border-error-500/30 bg-error-500/10 rounded-lg border p-3 text-center">
                <p className="text-error-500 text-sm">{generateError}</p>
              </div>
            )}
            <div className="flex justify-center">
              {assessment === null ? (
                <Button
                  onClick={() => (window.location.href = `/${locale}/initial-assessment`)}
                  variant="gradient"
                >
                  <Sparkles className="h-4 w-4" />
                  {tCommon("completeAssessment")}
                </Button>
              ) : (
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || assessment === undefined}
                  loading={isGenerating}
                  variant="gradient"
                >
                  <Sparkles className="h-4 w-4" />
                  {t("generatePlan")}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  const planData = (needsTranslation && hasTranslation
    ? mealPlan.translatedPlanData
    : mealPlan.planData) as unknown as GeneratedMealPlan;

  // Guard: if weeklyPlan is missing, show empty state instead of crashing
  if (!planData?.weeklyPlan) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("getStarted")}</p>
        </div>
        <EmptyState
          icon={UtensilsCrossed}
          title={tEmpty("noMealPlan.title")}
          description={tEmpty("noMealPlan.description")}
        />
      </div>
    );
  }

  const totalDays =
    mealPlan.startDate && mealPlan.endDate
      ? Math.ceil(
          (new Date(mealPlan.endDate).getTime() - new Date(mealPlan.startDate).getTime()) /
            86400000,
        )
      : 10;
  const dayPlan = resolveDayPlan(planData.weeklyPlan, selectedDay, mealPlan.startDate);

  // Normalize meals to handle both old (nested macros) and new (flat) formats
  const rawMeals = dayPlan?.meals ?? [];
  const meals = rawMeals.map(normalizeMeal);
  const dailyTotals = dayPlan
    ? {
        calories:
          dayPlan.dailyTotals?.calories ?? meals.reduce((sum, m) => sum + (m.calories || 0), 0),
        protein:
          dayPlan.dailyTotals?.protein ?? meals.reduce((sum, m) => sum + (m.protein || 0), 0),
        carbs: dayPlan.dailyTotals?.carbs ?? meals.reduce((sum, m) => sum + (m.carbs || 0), 0),
        fat: dayPlan.dailyTotals?.fat ?? meals.reduce((sum, m) => sum + (m.fat || 0), 0),
      }
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          {selectedDay === todayDayIndex ? t("todaysMeals") : t("title")}
        </h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {formatDateShort(mealPlan.startDate, locale)} -{" "}
          {formatDateShort(mealPlan.endDate, locale)}
        </p>
      </div>

      {/* Translating banner */}
      {needsTranslation && !hasTranslation && (
        <div className="border-primary/30 bg-primary/5 flex items-center gap-3 rounded-xl border p-4">
          <Loader2 className="text-primary h-5 w-5 shrink-0 animate-spin" />
          <div>
            <p className="text-primary text-sm font-semibold">{t("translating")}</p>
            <p className="text-muted-foreground text-xs">{t("translatingDescription")}</p>
          </div>
        </div>
      )}

      {/* Day Navigator */}
      <DayNavigator
        totalDays={totalDays}
        selectedDay={selectedDay}
        onSelectDay={(day) => {
          setSelectedDay(day);
          setExpandedMeal(0);
        }}
        planStartDate={mealPlan.startDate}
        todayDayIndex={todayDayIndex}
        featureColor="nutrition"
      />

      {/* Calorie Target Explanation */}
      {planData.dailyTargets && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <p className="text-xs text-blue-700">
            {t("calorieExplanation", {
              calories: toLocalDigits(planData.dailyTargets.calories, locale),
              protein: toLocalDigits(planData.dailyTargets.protein, locale),
              trainingDays: toLocalDigits(
                assessment?.scheduleAvailability?.days?.length ?? "—",
                locale,
              ),
            })}
          </p>
        </div>
      )}

      {/* Daily Nutrition Summary */}
      {dailyTotals && (
        <div className="scrollbar-hide flex gap-2 overflow-x-auto">
          <span className="bg-nutrition/10 text-nutrition flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold">
            {toLocalDigits(dailyTotals.calories, locale)} {t("calories")}
          </span>
          <span className="bg-nutrition/10 text-nutrition flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold">
            {toLocalDigits(dailyTotals.protein, locale)}
            {tUnits("g")} {t("protein")}
          </span>
          <span className="bg-nutrition/10 text-nutrition flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold">
            {toLocalDigits(dailyTotals.carbs, locale)}
            {tUnits("g")} {t("carbs")}
          </span>
          <span className="bg-nutrition/10 text-nutrition flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold">
            {toLocalDigits(dailyTotals.fat, locale)}
            {tUnits("g")} {t("fat")}
          </span>
        </div>
      )}

      {/* Swap error banner */}
      {swapError && (
        <div className="border-error-500/30 bg-error-500/10 flex items-center justify-between rounded-lg border px-3 py-2">
          <p className="text-error-500 text-sm">{swapError}</p>
          <button onClick={() => setSwapError(null)} className="text-error-500 text-xs font-medium">
            ✕
          </button>
        </div>
      )}

      {/* Meals */}
      {dayPlan && (
        <div className="space-y-3">
          {meals.map((meal, index) => {
            const isExpanded = expandedMeal === index;
            const hasAlternatives =
              Array.isArray(meal.alternatives) && meal.alternatives.length > 0;

            return (
              <div
                key={index}
                className={cn(
                  "bg-card shadow-card animate-slide-up overflow-hidden rounded-xl border transition-colors",
                  isExpanded ? "border-primary/40 ring-primary/10 ring-2" : "border-border",
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Meal Header */}
                <button
                  onClick={() => setExpandedMeal(isExpanded ? null : index)}
                  aria-expanded={isExpanded}
                  className="flex w-full items-center justify-between gap-3 p-4 text-start transition-colors hover:bg-neutral-50 active:scale-[0.97]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors",
                        isExpanded ? "bg-primary text-white" : "bg-neutral-100 text-neutral-500",
                      )}
                    >
                      {toLocalDigits(String(index + 1).padStart(2, "0"), locale)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">{meal.name}</h3>
                      <p className="text-muted-foreground mt-0.5 truncate text-xs">
                        {meal.ingredients?.slice(0, 3).join(", ")}
                        {(meal.ingredients?.length ?? 0) > 3 && "..."}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {hasAlternatives && (
                      <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-medium">
                        &#8596; {toLocalDigits(meal.alternatives!.length, locale)}
                      </span>
                    )}
                    <span className="text-nutrition text-sm font-semibold">
                      {toLocalDigits(meal.calories, locale)} {t("kcal")}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-all duration-200",
                        isExpanded ? "text-primary rotate-180" : "text-muted-foreground",
                      )}
                    />
                  </div>
                </button>

                {/* Expanded Content */}
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-200 ease-in-out",
                    isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0",
                  )}
                >
                  <div className="border-border space-y-4 border-t px-4 pt-4 pb-4">
                    {/* Macros */}
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium">
                        {t("protein")}: {toLocalDigits(meal.protein, locale)}
                        {tUnits("g")}
                      </span>
                      <span className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium">
                        {t("carbs")}: {toLocalDigits(meal.carbs, locale)}
                        {tUnits("g")}
                      </span>
                      <span className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium">
                        {t("fat")}: {toLocalDigits(meal.fat, locale)}
                        {tUnits("g")}
                      </span>
                    </div>

                    {/* Ingredients */}
                    <div>
                      <h4 className="mb-2 text-sm font-semibold">{t("ingredients")}</h4>
                      <div className="rounded-lg bg-neutral-50 p-3">
                        <ul className="space-y-1.5 text-sm">
                          {(Array.isArray(meal.ingredients) ? meal.ingredients : []).map(
                            (ingredient: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-nutrition mt-0.5">&#8226;</span>
                                {ingredient}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div>
                      <h4 className="mb-2 text-sm font-semibold">{t("instructions")}</h4>
                      <div className="rounded-lg bg-neutral-50 p-3">
                        <ol className="space-y-2 text-sm">
                          {(Array.isArray(meal.instructions) ? meal.instructions : []).map(
                            (instruction: string, i: number) => (
                              <li key={i} className="flex items-start gap-2.5">
                                <span className="bg-nutrition/12 text-nutrition mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                                  {toLocalDigits(i + 1, locale)}
                                </span>
                                {instruction}
                              </li>
                            ),
                          )}
                        </ol>
                      </div>
                    </div>

                    {/* Alternatives */}
                    {hasAlternatives && (
                      <div>
                        <h4 className="mb-2 text-sm font-semibold">{t("alternatives")}</h4>
                        <div className="border-nutrition/30 bg-nutrition/5 space-y-1.5 rounded-lg border border-dashed p-3">
                          {meal.alternatives!.map((alt, i) => {
                            if (typeof alt === "string") {
                              // Old format: plain string
                              return (
                                <div key={i} className="flex items-start gap-2 text-sm">
                                  <span className="text-nutrition">&#8596;</span>
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
                            const swapKey = `${selectedDay}-${index}-${i}`;
                            const isSwapping = swappingKey === swapKey;

                            const handleSwap = async (e: React.MouseEvent) => {
                              e.stopPropagation();
                              if (!mealPlan?._id || isSwapping) return;
                              setSwappingKey(swapKey);
                              setSwapError(null);
                              try {
                                await swapMeal({
                                  planId: mealPlan._id,
                                  dayKey: `day${selectedDay + 1}`,
                                  mealIndex: index,
                                  alternativeIndex: i,
                                });
                              } catch (err) {
                                console.error("Swap failed:", err);
                                setSwapError(err instanceof Error ? err.message : t("swapFailed"));
                              } finally {
                                setSwappingKey((prev) => (prev === swapKey ? null : prev));
                              }
                            };

                            return (
                              <div
                                key={i}
                                className="border-nutrition/20 overflow-hidden rounded-md border bg-white/60"
                              >
                                {/* Collapsed header */}
                                <div className="flex items-center">
                                  <button
                                    onClick={toggleAlt}
                                    aria-expanded={isAltExpanded}
                                    className="hover:bg-nutrition/5 flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2 text-start transition-colors"
                                  >
                                    <div className="flex min-w-0 items-center gap-2">
                                      <span className="text-nutrition shrink-0 text-sm">
                                        &#8596;
                                      </span>
                                      <span className="truncate text-sm font-medium">
                                        {normalizedAlt.name}
                                      </span>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                      <span className="bg-nutrition/10 text-nutrition rounded-full px-2 py-0.5 text-[10px] font-semibold">
                                        {toLocalDigits(normalizedAlt.calories, locale)} {t("kcal")}
                                      </span>
                                      <ChevronDown
                                        className={cn(
                                          "text-nutrition/60 h-3.5 w-3.5 transition-transform duration-150",
                                          isAltExpanded && "rotate-180",
                                        )}
                                      />
                                    </div>
                                  </button>
                                  <button
                                    onClick={handleSwap}
                                    disabled={isSwapping}
                                    className="text-nutrition hover:bg-nutrition/10 border-nutrition/20 flex h-full shrink-0 items-center gap-1 border-s px-2.5 py-2 text-xs font-medium transition-colors disabled:opacity-50"
                                    title={t("swap")}
                                  >
                                    <ArrowLeftRight
                                      className={cn("h-3.5 w-3.5", isSwapping && "animate-spin")}
                                    />
                                    <span className="hidden sm:inline">{t("swap")}</span>
                                  </button>
                                </div>

                                {/* Expanded body */}
                                <div
                                  className={cn(
                                    "overflow-hidden transition-all duration-150",
                                    isAltExpanded
                                      ? "max-h-[500px] opacity-100"
                                      : "max-h-0 opacity-0",
                                  )}
                                >
                                  <div className="border-nutrition/15 space-y-3 border-t px-3 pt-2 pb-3">
                                    {/* Macro chips */}
                                    <div className="flex flex-wrap gap-1.5">
                                      <span className="bg-nutrition/10 text-nutrition rounded-md px-2 py-0.5 text-[10px] font-medium">
                                        {t("protein")}:{" "}
                                        {toLocalDigits(normalizedAlt.protein, locale)}
                                        {tUnits("g")}
                                      </span>
                                      <span className="bg-nutrition/10 text-nutrition rounded-md px-2 py-0.5 text-[10px] font-medium">
                                        {t("carbs")}: {toLocalDigits(normalizedAlt.carbs, locale)}
                                        {tUnits("g")}
                                      </span>
                                      <span className="bg-nutrition/10 text-nutrition rounded-md px-2 py-0.5 text-[10px] font-medium">
                                        {t("fat")}: {toLocalDigits(normalizedAlt.fat, locale)}
                                        {tUnits("g")}
                                      </span>
                                    </div>

                                    {/* Ingredients */}
                                    {normalizedAlt.ingredients.length > 0 && (
                                      <div>
                                        <h5 className="text-muted-foreground mb-1 text-xs font-semibold">
                                          {t("ingredients")}
                                        </h5>
                                        <ul className="space-y-1 text-xs">
                                          {normalizedAlt.ingredients.map(
                                            (ingredient: string, j: number) => (
                                              <li key={j} className="flex items-start gap-1.5">
                                                <span className="text-nutrition mt-0.5">
                                                  &#8226;
                                                </span>
                                                {ingredient}
                                              </li>
                                            ),
                                          )}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Instructions */}
                                    {normalizedAlt.instructions.length > 0 && (
                                      <div>
                                        <h5 className="text-muted-foreground mb-1 text-xs font-semibold">
                                          {t("instructions")}
                                        </h5>
                                        <ol className="space-y-1 text-xs">
                                          {normalizedAlt.instructions.map(
                                            (instruction: string, j: number) => (
                                              <li key={j} className="flex items-start gap-1.5">
                                                <span className="bg-nutrition/12 text-nutrition mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold">
                                                  {toLocalDigits(j + 1, locale)}
                                                </span>
                                                {instruction}
                                              </li>
                                            ),
                                          )}
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
        <div className="border-border rounded-xl border bg-neutral-50 p-4">
          <p className="text-muted-foreground mb-1 text-xs font-medium">{t("coachNotes")}</p>
          <p className="text-sm">{planData.notes}</p>
        </div>
      )}
    </div>
  );
}
