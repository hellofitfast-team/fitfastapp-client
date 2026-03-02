"use client";

import { useTranslations } from "next-intl";
import {
  UtensilsCrossed,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";
import { cn } from "@fitfast/ui/cn";
import type { GeneratedMealPlan } from "@/lib/ai/meal-plan-generator";

type Meal = GeneratedMealPlan["weeklyPlan"][string]["meals"][number];

interface MealCompletion {
  mealIndex: number;
  completed: boolean;
  notes?: string;
}

interface MealTrackingProps {
  todaysMeals: Meal[];
  mealCompletions: MealCompletion[];
  isTogglingMeal: number | null;
  mealNotes: Record<number, string>;
  onMealToggle: (index: number, completed: boolean) => void;
  onMealNotesChange: (notes: Record<number, string>) => void;
  isMealsExpanded: boolean;
  onToggleExpand: () => void;
}

export function MealTracking({
  todaysMeals,
  mealCompletions,
  isTogglingMeal,
  mealNotes,
  onMealToggle,
  onMealNotesChange,
  isMealsExpanded,
  onToggleExpand,
}: MealTrackingProps) {
  const t = useTranslations("tracking");
  const tMeals = useTranslations("meals");

  const getMealCompletion = (mealIndex: number) => {
    return mealCompletions.find((c) => c.mealIndex === mealIndex);
  };

  return (
    <div className="border-border bg-card shadow-card overflow-hidden rounded-xl border">
      <button
        onClick={onToggleExpand}
        className="border-border bg-nutrition/8 hover:bg-nutrition/12 flex w-full items-center justify-between border-b p-4 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-nutrition/12 flex h-9 w-9 items-center justify-center rounded-lg">
            <UtensilsCrossed className="text-nutrition h-4 w-4" />
          </div>
          <div className="text-start">
            <h2 className="text-sm font-semibold">{t("mealTracking")}</h2>
            <p className="text-muted-foreground text-xs">
              {mealCompletions.filter((c) => c.completed).length} {t("of")} {todaysMeals.length}{" "}
              {t("mealsCompleted")}
            </p>
          </div>
        </div>
        {isMealsExpanded ? (
          <ChevronUp className="text-muted-foreground h-4 w-4" />
        ) : (
          <ChevronDown className="text-muted-foreground h-4 w-4" />
        )}
      </button>

      {isMealsExpanded && (
        <div className="divide-border divide-y">
          {todaysMeals.length === 0 ? (
            <div className="p-10 text-center">
              <UtensilsCrossed className="text-muted-foreground/30 mx-auto h-10 w-10" />
              <p className="mt-3 text-sm font-medium">{t("noMealsPlanned")}</p>
            </div>
          ) : (
            todaysMeals.map((meal, index) => {
              const completion = getMealCompletion(index);
              const isCompleted = completion?.completed || false;

              return (
                <div
                  key={index}
                  className="animate-slide-up p-4 transition-colors hover:bg-neutral-50"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => onMealToggle(index, isCompleted)}
                      disabled={isTogglingMeal === index}
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
                        isCompleted
                          ? "border-success-500 bg-success-500"
                          : "hover:border-primary border-neutral-300",
                      )}
                    >
                      {isTogglingMeal === index ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      ) : (
                        <Circle className="h-5 w-5 text-neutral-300" />
                      )}
                    </button>

                    <div className="flex-1 space-y-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4
                            className={cn(
                              "text-sm font-medium",
                              isCompleted && "text-muted-foreground line-through",
                            )}
                          >
                            {meal.name}
                          </h4>
                          <span className="text-muted-foreground text-xs">{meal.time}</span>
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {meal.calories} {tMeals("calories")} • {meal.protein}g {tMeals("protein")}{" "}
                          • {meal.carbs}g {tMeals("carbs")} • {meal.fat}g {tMeals("fat")}
                        </p>
                      </div>

                      <textarea
                        placeholder={t("addNotes")}
                        value={mealNotes[index] || completion?.notes || ""}
                        onChange={(e) =>
                          onMealNotesChange({ ...mealNotes, [index]: e.target.value })
                        }
                        className="border-input placeholder:text-muted-foreground focus:ring-ring min-h-[50px] w-full resize-none rounded-lg border bg-neutral-50 p-2.5 text-xs transition-colors focus:ring-2 focus:outline-none"
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
  );
}
