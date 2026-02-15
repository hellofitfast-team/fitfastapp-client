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
import type { GeneratedWorkoutPlan } from "@/lib/ai/workout-plan-generator";

type WorkoutDay = GeneratedWorkoutPlan["weeklyPlan"][string];

interface WorkoutCompletion {
  workout_index: number;
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
    return workoutCompletions.find((c) => c.workout_index === workoutIndex);
  };

  return (
    <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <button
        onClick={onToggleExpand}
        className="w-full border-b-4 border-black bg-black p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center bg-primary">
            <Dumbbell className="h-6 w-6 text-black" />
          </div>
          <div className="text-start">
            <h2 className="font-black text-xl text-cream tracking-tight">
              {t("workoutTracking").toUpperCase()}
            </h2>
            <p className="font-bold text-sm text-primary">
              {todaysWorkout?.restDay
                ? tWorkouts("restDay").toUpperCase()
                : workoutCompletions.filter((c) => c.completed).length > 0
                ? t("workoutCompleted").toUpperCase()
                : t("workoutNotCompleted").toUpperCase()}
            </p>
          </div>
        </div>
        <div className="h-10 w-10 flex items-center justify-center bg-primary text-black">
          {isWorkoutsExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </button>

      {isWorkoutsExpanded && (
        <div className="p-5">
          {!todaysWorkout ? (
            <div className="p-8 text-center border-4 border-dashed border-black">
              <Dumbbell className="mx-auto h-12 w-12 text-neutral-300" />
              <p className="mt-4 font-black">{t("noWorkoutPlanned").toUpperCase()}</p>
            </div>
          ) : todaysWorkout.restDay ? (
            <div className="p-8 text-center border-4 border-black bg-neutral-100">
              <Dumbbell className="mx-auto h-12 w-12 text-neutral-400" />
              <p className="mt-4 font-black text-xl">{tWorkouts("restDay").toUpperCase()}</p>
              <p className="mt-2 font-mono text-xs text-neutral-500">
                {t("takeTimeToRecover").toUpperCase()}
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <button
                onClick={() => onWorkoutToggle(0, getWorkoutCompletion(0)?.completed || false)}
                disabled={isTogglingWorkout === 0}
                className={`h-12 w-12 shrink-0 border-4 border-black flex items-center justify-center transition-colors ${
                  getWorkoutCompletion(0)?.completed ? "bg-success-500" : "bg-cream hover:bg-neutral-100"
                }`}
              >
                {isTogglingWorkout === 0 ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : getWorkoutCompletion(0)?.completed ? (
                  <CheckCircle2 className="h-6 w-6 text-black" />
                ) : (
                  <Circle className="h-6 w-6 text-neutral-400" />
                )}
              </button>

              <div className="flex-1 space-y-4">
                <div>
                  <h4 className="font-black text-lg tracking-tight">
                    {todaysWorkout.workoutName?.toUpperCase() || tWorkouts("todaysWorkout").toUpperCase()}
                  </h4>
                  <p className="font-bold text-sm text-neutral-500 mt-1">
                    {todaysWorkout.duration} {tCommon("min").toUpperCase()} • {todaysWorkout.targetMuscles?.join(", ").toUpperCase()}
                  </p>
                </div>

                <div className="flex gap-4 font-bold text-sm">
                  <span className="px-2 py-1 border-2 border-black bg-neutral-100">
                    {todaysWorkout.exercises?.length || 0} {tWorkouts("exercises").toUpperCase()}
                  </span>
                </div>

                <textarea
                  placeholder={t("addWorkoutNotes").toUpperCase()}
                  value={workoutNotes[0] || getWorkoutCompletion(0)?.notes || ""}
                  onChange={(e) => onWorkoutNotesChange({ ...workoutNotes, [0]: e.target.value })}
                  className="w-full min-h-[60px] p-3 border-4 border-black bg-neutral-50 font-bold text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:bg-white transition-colors resize-none"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
