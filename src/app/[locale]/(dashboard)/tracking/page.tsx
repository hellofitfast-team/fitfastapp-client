"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentMealPlan } from "@/hooks/use-meal-plans";
import { useCurrentWorkoutPlan } from "@/hooks/use-workout-plans";
import {
  useTracking,
  toggleMealCompletion,
  toggleWorkoutCompletion,
  saveDailyReflection,
} from "@/hooks/use-tracking";
import { Target } from "lucide-react";
import type { GeneratedMealPlan } from "@/lib/ai/meal-plan-generator";
import type { GeneratedWorkoutPlan } from "@/lib/ai/workout-plan-generator";
import { EmptyState } from "@/components/ui/empty-state";
import { TrackingHeader } from "./_components/tracking-header";
import { DateProgress } from "./_components/date-progress";
import { MealTracking } from "./_components/meal-tracking";
import { WorkoutTracking } from "./_components/workout-tracking";
import { DailyReflection } from "./_components/daily-reflection";
import { TrackingSkeleton } from "./_components/tracking-skeleton";

export default function TrackingPage() {
  const tEmpty = useTranslations("emptyStates");
  const router = useRouter();

  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isMealsExpanded, setIsMealsExpanded] = useState(true);
  const [isWorkoutsExpanded, setIsWorkoutsExpanded] = useState(true);
  const [mealNotes, setMealNotes] = useState<{ [key: number]: string }>({});
  const [workoutNotes, setWorkoutNotes] = useState<{ [key: number]: string }>({});
  const [isTogglingMeal, setIsTogglingMeal] = useState<number | null>(null);
  const [isTogglingWorkout, setIsTogglingWorkout] = useState<number | null>(null);

  const { mealPlan, isLoading: mealPlanLoading } = useCurrentMealPlan(user?.id);
  const { workoutPlan, isLoading: workoutPlanLoading } = useCurrentWorkoutPlan(user?.id);
  const { trackingData, isLoading: trackingLoading, refetch } = useTracking(user?.id, selectedDate);

  const getDayName = (date: string): string => {
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return dayNames[new Date(date).getDay()];
  };

  const handleMealToggle = async (mealIndex: number, currentlyCompleted: boolean) => {
    if (!user?.id || !mealPlan?.id) return;
    setIsTogglingMeal(mealIndex);
    try {
      await toggleMealCompletion(user.id, mealPlan.id, selectedDate, mealIndex, !currentlyCompleted, mealNotes[mealIndex]);
      await refetch();
    } catch (error) {
      console.error("Failed to toggle meal completion:", error);
    } finally {
      setIsTogglingMeal(null);
    }
  };

  const handleWorkoutToggle = async (workoutIndex: number, currentlyCompleted: boolean) => {
    if (!user?.id || !workoutPlan?.id) return;
    setIsTogglingWorkout(workoutIndex);
    try {
      await toggleWorkoutCompletion(user.id, workoutPlan.id, selectedDate, workoutIndex, !currentlyCompleted, workoutNotes[workoutIndex]);
      await refetch();
    } catch (error) {
      console.error("Failed to toggle workout completion:", error);
    } finally {
      setIsTogglingWorkout(null);
    }
  };

  const onReflectionSubmit = async (data: { reflection: string }) => {
    if (!user?.id) return;
    try {
      await saveDailyReflection(user.id, selectedDate, data.reflection);
      await refetch();
    } catch (error) {
      console.error("Failed to save reflection:", error);
    }
  };

  const calculateCompletionPercentage = (): number => {
    const dayName = getDayName(selectedDate);
    const mealPlanData = mealPlan?.plan_data as unknown as GeneratedMealPlan;
    const workoutPlanData = workoutPlan?.plan_data as unknown as GeneratedWorkoutPlan;

    let totalItems = 0;
    let completedItems = 0;

    if (mealPlanData?.weeklyPlan?.[dayName]) {
      const meals = mealPlanData.weeklyPlan[dayName].meals;
      totalItems += meals.length;
      completedItems += trackingData.mealCompletions.filter((c) => c.completed).length;
    }

    if (workoutPlanData?.weeklyPlan?.[dayName]) {
      const workout = workoutPlanData.weeklyPlan[dayName];
      if (!workout.restDay) {
        totalItems += 1;
        completedItems += trackingData.workoutCompletions.filter((c) => c.completed).length;
      }
    }

    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  const completionPercentage = calculateCompletionPercentage();
  const dayName = getDayName(selectedDate);
  const mealPlanData = mealPlan?.plan_data as unknown as GeneratedMealPlan;
  const workoutPlanData = workoutPlan?.plan_data as unknown as GeneratedWorkoutPlan;
  const todaysMeals = mealPlanData?.weeklyPlan?.[dayName]?.meals || [];
  const todaysWorkout = workoutPlanData?.weeklyPlan?.[dayName];

  if (mealPlanLoading || workoutPlanLoading || trackingLoading) {
    return <TrackingSkeleton />;
  }

  // Show empty state if no plans exist
  if (!mealPlan && !workoutPlan) {
    return (
      <div className="space-y-6">
        <TrackingHeader />
        <EmptyState
          icon={Target}
          title={tEmpty("noTrackingData.title")}
          description={tEmpty("noTrackingData.description")}
          action={{
            label: tEmpty("noCheckIns.action"),
            onClick: () => router.push("/check-in"),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TrackingHeader />

      <DateProgress
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        completionPercentage={completionPercentage}
      />

      <MealTracking
        todaysMeals={todaysMeals}
        mealCompletions={trackingData.mealCompletions}
        isTogglingMeal={isTogglingMeal}
        mealNotes={mealNotes}
        onMealToggle={handleMealToggle}
        onMealNotesChange={setMealNotes}
        isMealsExpanded={isMealsExpanded}
        onToggleExpand={() => setIsMealsExpanded(!isMealsExpanded)}
      />

      <WorkoutTracking
        todaysWorkout={todaysWorkout}
        workoutCompletions={trackingData.workoutCompletions}
        isTogglingWorkout={isTogglingWorkout}
        workoutNotes={workoutNotes}
        onWorkoutToggle={handleWorkoutToggle}
        onWorkoutNotesChange={setWorkoutNotes}
        isWorkoutsExpanded={isWorkoutsExpanded}
        onToggleExpand={() => setIsWorkoutsExpanded(!isWorkoutsExpanded)}
      />

      <DailyReflection
        defaultReflection={trackingData.dailyReflection?.reflection || ""}
        onSubmit={onReflectionSubmit}
      />
    </div>
  );
}
