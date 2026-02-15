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
import type { GeneratedMealPlan } from "@/lib/ai/meal-plan-generator";

type Meal = GeneratedMealPlan["weeklyPlan"][string]["meals"][number];

interface MealCompletion {
  meal_index: number;
  completed: boolean;
  notes?: string | null;
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
    return mealCompletions.find((c) => c.meal_index === mealIndex);
  };

  return (
    <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <button
        onClick={onToggleExpand}
        className="w-full border-b-4 border-black bg-primary p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center bg-black">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
          </div>
          <div className="text-start">
            <h2 className="font-black text-xl text-white tracking-tight">
              {t("mealTracking").toUpperCase()}
            </h2>
            <p className="font-bold text-sm text-white/80">
              {mealCompletions.filter((c) => c.completed).length} {t("of").toUpperCase()} {todaysMeals.length} {t("mealsCompleted").toUpperCase()}
            </p>
          </div>
        </div>
        <div className="h-10 w-10 flex items-center justify-center bg-black text-white">
          {isMealsExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </button>

      {isMealsExpanded && (
        <div className="divide-y-4 divide-black">
          {todaysMeals.length === 0 ? (
            <div className="p-12 text-center">
              <UtensilsCrossed className="mx-auto h-12 w-12 text-neutral-300" />
              <p className="mt-4 font-black">{t("noMealsPlanned").toUpperCase()}</p>
            </div>
          ) : (
            todaysMeals.map((meal, index) => {
              const completion = getMealCompletion(index);
              const isCompleted = completion?.completed || false;

              return (
                <div key={index} className="p-5 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => onMealToggle(index, isCompleted)}
                      disabled={isTogglingMeal === index}
                      className={`h-12 w-12 shrink-0 border-4 border-black flex items-center justify-center transition-colors ${
                        isCompleted ? "bg-success-500" : "bg-cream hover:bg-neutral-100"
                      }`}
                    >
                      {isTogglingMeal === index ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="h-6 w-6 text-black" />
                      ) : (
                        <Circle className="h-6 w-6 text-neutral-400" />
                      )}
                    </button>

                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className={`font-black text-lg tracking-tight ${isCompleted ? "line-through text-neutral-400" : ""}`}>
                            {meal.name.toUpperCase()}
                          </h4>
                          <span className="font-mono text-xs text-neutral-500">{meal.time}</span>
                        </div>
                        <p className="font-bold text-sm text-neutral-500 mt-1">
                          {meal.calories} {tMeals("calories").toUpperCase()} • {meal.protein}g {tMeals("protein").toUpperCase()} • {meal.carbs}g {tMeals("carbs").toUpperCase()} • {meal.fat}g {tMeals("fat").toUpperCase()}
                        </p>
                      </div>

                      <textarea
                        placeholder={t("addNotes").toUpperCase()}
                        value={mealNotes[index] || completion?.notes || ""}
                        onChange={(e) => onMealNotesChange({ ...mealNotes, [index]: e.target.value })}
                        className="w-full min-h-[60px] p-3 border-4 border-black bg-neutral-50 font-mono text-xs uppercase placeholder:text-neutral-400 focus:outline-none focus:bg-white transition-colors resize-none"
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
