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
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <button
        onClick={onToggleExpand}
        className="w-full p-4 flex items-center justify-between border-b border-border bg-[#10B981]/8 hover:bg-[#10B981]/12 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10B981]/12">
            <UtensilsCrossed className="h-4 w-4 text-[#10B981]" />
          </div>
          <div className="text-start">
            <h2 className="font-semibold text-sm">{t("mealTracking")}</h2>
            <p className="text-xs text-muted-foreground">
              {mealCompletions.filter((c) => c.completed).length} {t("of")} {todaysMeals.length} {t("mealsCompleted")}
            </p>
          </div>
        </div>
        {isMealsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {isMealsExpanded && (
        <div className="divide-y divide-border">
          {todaysMeals.length === 0 ? (
            <div className="p-10 text-center">
              <UtensilsCrossed className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">{t("noMealsPlanned")}</p>
            </div>
          ) : (
            todaysMeals.map((meal, index) => {
              const completion = getMealCompletion(index);
              const isCompleted = completion?.completed || false;

              return (
                <div key={index} className="p-4 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => onMealToggle(index, isCompleted)}
                      disabled={isTogglingMeal === index}
                      className={cn(
                        "h-9 w-9 shrink-0 rounded-lg border-2 flex items-center justify-center transition-colors",
                        isCompleted
                          ? "border-success-500 bg-success-500"
                          : "border-neutral-300 hover:border-primary"
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
                          <h4 className={cn("font-medium text-sm", isCompleted && "line-through text-muted-foreground")}>
                            {meal.name}
                          </h4>
                          <span className="text-xs text-muted-foreground">{meal.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {meal.calories} {tMeals("calories")} • {meal.protein}g {tMeals("protein")} • {meal.carbs}g {tMeals("carbs")} • {meal.fat}g {tMeals("fat")}
                        </p>
                      </div>

                      <textarea
                        placeholder={t("addNotes")}
                        value={mealNotes[index] || completion?.notes || ""}
                        onChange={(e) => onMealNotesChange({ ...mealNotes, [index]: e.target.value })}
                        className="w-full min-h-[50px] p-2.5 rounded-lg border border-input bg-neutral-50 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
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
