"use client";

import { useTranslations } from "next-intl";
import { Dumbbell, ChevronDown, ChevronUp, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@fitfast/ui/cn";
import type { GeneratedWorkoutPlan } from "@/lib/ai/workout-plan-generator";

type WorkoutDay = GeneratedWorkoutPlan["weeklyPlan"][string];

interface WorkoutCompletion {
  workoutIndex: number;
  completed: boolean;
  notes?: string;
}

interface WorkoutTrackingProps {
  todaysWorkout: WorkoutDay | undefined;
  workoutCompletions: WorkoutCompletion[];
  isTogglingWorkout: number | null;
  workoutNotes: Record<number, string>;
  onWorkoutToggle: (index: number, completed: boolean) => void;
  onWorkoutNotesChange: (notes: Record<number, string>) => void;
  isWorkoutsExpanded: boolean;
  onToggleExpand: () => void;
}

export function WorkoutTracking({
  todaysWorkout,
  workoutCompletions,
  isTogglingWorkout,
  workoutNotes,
  onWorkoutToggle,
  onWorkoutNotesChange,
  isWorkoutsExpanded,
  onToggleExpand,
}: WorkoutTrackingProps) {
  const t = useTranslations("tracking");
  const tWorkouts = useTranslations("workouts");
  const tCommon = useTranslations("common");

  const getWorkoutCompletion = (workoutIndex: number) => {
    return workoutCompletions.find((c) => c.workoutIndex === workoutIndex);
  };

  return (
    <div className="border-border bg-card shadow-card overflow-hidden rounded-xl border">
      <button
        onClick={onToggleExpand}
        className="border-border flex w-full items-center justify-between border-b p-4 transition-colors hover:bg-neutral-50"
      >
        <div className="flex items-center gap-3">
          <div className="bg-fitness/12 flex h-9 w-9 items-center justify-center rounded-lg">
            <Dumbbell className="text-fitness h-4 w-4" />
          </div>
          <div className="text-start">
            <h2 className="text-sm font-semibold">{t("workoutTracking")}</h2>
            <p className="text-muted-foreground text-xs">
              {todaysWorkout?.restDay
                ? tWorkouts("restDay")
                : workoutCompletions.filter((c) => c.completed).length > 0
                  ? t("workoutCompleted")
                  : t("workoutNotCompleted")}
            </p>
          </div>
        </div>
        {isWorkoutsExpanded ? (
          <ChevronUp className="text-muted-foreground h-4 w-4" />
        ) : (
          <ChevronDown className="text-muted-foreground h-4 w-4" />
        )}
      </button>

      {isWorkoutsExpanded && (
        <div className="p-4">
          {!todaysWorkout ? (
            <div className="border-border rounded-lg border border-dashed p-8 text-center">
              <Dumbbell className="text-muted-foreground/30 mx-auto h-10 w-10" />
              <p className="mt-3 text-sm font-medium">{t("noWorkoutPlanned")}</p>
            </div>
          ) : todaysWorkout.restDay ? (
            <div className="rounded-lg bg-neutral-50 p-8 text-center">
              <Dumbbell className="text-muted-foreground/40 mx-auto h-10 w-10" />
              <p className="mt-3 font-semibold">{tWorkouts("restDay")}</p>
              <p className="text-muted-foreground mt-1 text-xs">{t("takeTimeToRecover")}</p>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => onWorkoutToggle(0, getWorkoutCompletion(0)?.completed || false)}
                disabled={isTogglingWorkout === 0}
                aria-label={
                  getWorkoutCompletion(0)?.completed ? t("markIncomplete") : t("markComplete")
                }
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
                  getWorkoutCompletion(0)?.completed
                    ? "border-success-500 bg-success-500"
                    : "hover:border-primary border-neutral-300",
                )}
              >
                {isTogglingWorkout === 0 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : getWorkoutCompletion(0)?.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-white" />
                ) : (
                  <Circle className="h-5 w-5 text-neutral-300" />
                )}
              </button>

              <div className="flex-1 space-y-3">
                <div>
                  <h4 className="text-sm font-medium">
                    {todaysWorkout.workoutName || tWorkouts("todaysWorkout")}
                  </h4>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {todaysWorkout.duration} {tCommon("min")} •{" "}
                    {todaysWorkout.targetMuscles?.join(", ")}
                  </p>
                </div>

                <div className="flex gap-2">
                  <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium">
                    {todaysWorkout.exercises?.length || 0} {tWorkouts("exercises")}
                  </span>
                </div>

                <textarea
                  placeholder={t("addWorkoutNotes")}
                  value={workoutNotes[0] || getWorkoutCompletion(0)?.notes || ""}
                  onChange={(e) => onWorkoutNotesChange({ ...workoutNotes, [0]: e.target.value })}
                  className="border-input placeholder:text-muted-foreground focus:ring-ring min-h-[50px] w-full resize-none rounded-lg border bg-neutral-50 p-2.5 text-xs transition-colors focus:ring-2 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
