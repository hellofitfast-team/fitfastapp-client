"use client";

import { useTranslations } from "next-intl";
import {
  Dumbbell,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";
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
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <button
        onClick={onToggleExpand}
        className="w-full p-4 flex items-center justify-between border-b border-border hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F97316]/12">
            <Dumbbell className="h-4 w-4 text-[#F97316]" />
          </div>
          <div className="text-start">
            <h2 className="font-semibold text-sm">{t("workoutTracking")}</h2>
            <p className="text-xs text-muted-foreground">
              {todaysWorkout?.restDay
                ? tWorkouts("restDay")
                : workoutCompletions.filter((c) => c.completed).length > 0
                ? t("workoutCompleted")
                : t("workoutNotCompleted")}
            </p>
          </div>
        </div>
        {isWorkoutsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {isWorkoutsExpanded && (
        <div className="p-4">
          {!todaysWorkout ? (
            <div className="p-8 text-center rounded-lg border border-dashed border-border">
              <Dumbbell className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">{t("noWorkoutPlanned")}</p>
            </div>
          ) : todaysWorkout.restDay ? (
            <div className="p-8 text-center rounded-lg bg-neutral-50">
              <Dumbbell className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 font-semibold">{tWorkouts("restDay")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("takeTimeToRecover")}</p>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <button
                onClick={() => onWorkoutToggle(0, getWorkoutCompletion(0)?.completed || false)}
                disabled={isTogglingWorkout === 0}
                className={cn(
                  "h-9 w-9 shrink-0 rounded-lg border-2 flex items-center justify-center transition-colors",
                  getWorkoutCompletion(0)?.completed
                    ? "border-success-500 bg-success-500"
                    : "border-neutral-300 hover:border-primary"
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
                  <h4 className="font-medium text-sm">
                    {todaysWorkout.workoutName || tWorkouts("todaysWorkout")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {todaysWorkout.duration} {tCommon("min")} • {todaysWorkout.targetMuscles?.join(", ")}
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
                  className="w-full min-h-[50px] p-2.5 rounded-lg border border-input bg-neutral-50 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
