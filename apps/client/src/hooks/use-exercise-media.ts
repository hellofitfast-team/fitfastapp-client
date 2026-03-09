"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface ExerciseWithDbId {
  exerciseDbId?: string;
}

/**
 * Fetches GIF media for exercises that have an exerciseDbId.
 * IDs originate from workoutPlanEngine (Convex Doc._id) but are
 * stored as plain strings in the plan JSON — the cast is safe.
 */
export function useExerciseMedia(exercises: ExerciseWithDbId[]) {
  const ids = exercises
    .map((e) => e.exerciseDbId)
    .filter((id): id is string => !!id) as Id<"exerciseDatabase">[];

  const media = useQuery(
    api.exerciseDatabase.getExerciseMedia,
    ids.length > 0 ? { exerciseIds: ids } : "skip",
  );

  return media ?? {};
}
