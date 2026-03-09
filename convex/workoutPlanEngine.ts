/**
 * Deterministic workout plan builder.
 * Takes exercises from the database and builds a workout plan JSON
 * that is backward-compatible with the AI-generated JSON structure.
 *
 * Pure function — no database access, no Convex server imports.
 */

import type { WorkoutSplit } from "./workoutSplitEngine";

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface Exercise {
  _id: string;
  name: string;
  nameAr: string;
  category: "compound" | "accessory" | "isolation" | "warmup" | "cooldown" | "cardio";
  movementPattern: "push" | "pull" | "squat" | "hinge" | "carry" | "rotation" | "other";
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  instructions: string;
  instructionsAr: string;
  contraindications: string[];
  defaultSets: number;
  defaultRepsMin: number;
  defaultRepsMax: number;
  defaultRestSeconds: number;
  isActive: boolean;
  sortOrder?: number;
}

export interface WorkoutPlanInput {
  split: WorkoutSplit;
  planDuration: number;
  experienceLevel: "beginner" | "intermediate" | "advanced";
  goal: string;
  trainingDaysPerWeek: number;
  injuries: string[];
  adherenceLevel: number | null;
  energyLevel: number | null;
  sleepQuality: number | null;
  previousPlan: any | null;
  language: "en" | "ar";
  availableEquipment?: string[];
}

// ---------------------------------------------------------------------------
// Output types (backward-compatible with AI-generated JSON)
// ---------------------------------------------------------------------------

interface WarmupCooldownExercise {
  name: string;
  exerciseDbId: string;
  duration: number;
  instructions: string[];
}

interface WorkoutExercise {
  name: string;
  exerciseDbId: string;
  sets: number;
  reps: string;
  restBetweenSets: string;
  targetMuscles: string[];
  instructions: string[];
}

interface TrainingDay {
  workoutName: string;
  duration: number;
  targetMuscles: string[];
  restDay: false;
  warmup: { exercises: WarmupCooldownExercise[] };
  exercises: WorkoutExercise[];
  cooldown: { exercises: WarmupCooldownExercise[] };
}

interface RestDay {
  restDay: true;
  workoutName: string;
}

export interface WorkoutPlanOutput {
  splitType: string;
  splitName: string;
  splitDescription: string;
  weeklyPlan: Record<string, TrainingDay | RestDay>;
  progressionNotes: string;
  safetyTips: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIFFICULTY_RANK: Record<string, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

/** Muscles targeted by each day label (case-insensitive lookup). */
const DAY_LABEL_MUSCLES: Record<string, string[]> = {
  "full body": [
    "chest",
    "back",
    "shoulders",
    "biceps",
    "triceps",
    "quads",
    "hamstrings",
    "glutes",
    "calves",
    "core",
  ],
  upper: ["chest", "back", "shoulders", "biceps", "triceps"],
  lower: ["quads", "hamstrings", "glutes", "calves"],
  push: ["chest", "shoulders", "triceps"],
  pull: ["back", "biceps", "rear_delts"],
  legs: ["quads", "hamstrings", "glutes", "calves"],
  // Arnold Split
  "chest+back": ["chest", "back"],
  "shoulders+arms": ["shoulders", "biceps", "triceps"],
  // Anterior/Posterior
  anterior: ["chest", "quads", "shoulders", "core"],
  posterior: ["back", "hamstrings", "glutes", "rear_delts"],
  // Bro Split
  chest: ["chest"],
  back: ["back"],
  shoulders: ["shoulders", "rear_delts"],
  arms: ["biceps", "triceps", "forearms"],
  // PHUL
  "power upper": ["chest", "back", "shoulders", "biceps", "triceps"],
  "power lower": ["quads", "hamstrings", "glutes", "calves"],
  "hypertrophy upper": ["chest", "back", "shoulders", "biceps", "triceps"],
  "hypertrophy lower": ["quads", "hamstrings", "glutes", "calves"],
  // Arabic labels
  "صدر+ظهر": ["chest", "back"],
  "أكتاف+ذراعين": ["shoulders", "biceps", "triceps"],
  أمامي: ["chest", "quads", "shoulders", "core"],
  خلفي: ["back", "hamstrings", "glutes", "rear_delts"],
  صدر: ["chest"],
  ظهر: ["back"],
  أكتاف: ["shoulders", "rear_delts"],
  ذراعين: ["biceps", "triceps", "forearms"],
  "قوة علوي": ["chest", "back", "shoulders", "biceps", "triceps"],
  "قوة سفلي": ["quads", "hamstrings", "glutes", "calves"],
  "تضخيم علوي": ["chest", "back", "shoulders", "biceps", "triceps"],
  "تضخيم سفلي": ["quads", "hamstrings", "glutes", "calves"],
};

/** Exercise count ranges per experience level. */
const EXERCISE_COUNTS: Record<string, { min: number; max: number }> = {
  beginner: { min: 4, max: 5 },
  intermediate: { min: 5, max: 6 },
  advanced: { min: 6, max: 8 },
};

/** Goal-based programming parameters. */
const GOAL_PARAMS: Record<
  string,
  { sets: number; repsMin: number; repsMax: number; restSeconds: number }
> = {
  strength: { sets: 4, repsMin: 3, repsMax: 6, restSeconds: 150 },
  hypertrophy: { sets: 3, repsMin: 8, repsMax: 12, restSeconds: 90 },
  endurance: { sets: 3, repsMin: 15, repsMax: 20, restSeconds: 45 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase();
}

function musclesForLabel(label: string): string[] | null {
  const key = normalizeLabel(label);
  if (key === "rest" || key === "راحة") return null;
  return DAY_LABEL_MUSCLES[key] ?? DAY_LABEL_MUSCLES["full body"]!;
}

function exerciseName(ex: Exercise, lang: "en" | "ar"): string {
  return lang === "ar" && ex.nameAr ? ex.nameAr : ex.name;
}

function exerciseInstructions(ex: Exercise, lang: "en" | "ar"): string[] {
  const raw = lang === "ar" && ex.instructionsAr ? ex.instructionsAr : ex.instructions;
  if (!raw) return [];
  // Split on newlines or periods to get individual steps, filter empties
  return raw
    .split(/\n|(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function hasInjuryConflict(ex: Exercise, injuries: string[]): boolean {
  if (injuries.length === 0) return false;
  const injurySet = new Set(injuries.map((i) => i.toLowerCase()));
  for (const c of ex.contraindications) {
    if (injurySet.has(c.toLowerCase())) return true;
  }
  // Also check if any primary/secondary muscles overlap with injury keywords
  for (const m of [...ex.primaryMuscles, ...ex.secondaryMuscles]) {
    if (injurySet.has(m.toLowerCase())) return true;
  }
  return false;
}

function equipmentAvailable(ex: Exercise, available: string[] | undefined): boolean {
  if (!available || available.length === 0) return true;
  if (ex.equipment.length === 0) return true; // bodyweight
  const set = new Set(available.map((e) => e.toLowerCase()));
  return ex.equipment.some((eq) => set.has(eq.toLowerCase()));
}

function goalParams(goal: string) {
  const key = goal.toLowerCase();
  if (key.includes("strength") || key.includes("قوة")) return GOAL_PARAMS.strength!;
  if (key.includes("endurance") || key.includes("تحمل")) return GOAL_PARAMS.endurance!;
  // Default to hypertrophy for muscle gain, weight loss, general fitness, etc.
  return GOAL_PARAMS.hypertrophy!;
}

/** Look up a previous plan's exercise by name to apply progressive overload. */
function findPreviousExercise(
  previousPlan: any,
  name: string,
): { sets: number; repsMin: number; repsMax: number } | null {
  if (!previousPlan?.weeklyPlan) return null;
  for (const dayData of Object.values(previousPlan.weeklyPlan) as any[]) {
    if (dayData.restDay || !dayData.exercises) continue;
    for (const ex of dayData.exercises) {
      if (ex.name === name) {
        const repsParts = String(ex.reps).split("-").map(Number);
        const rMin = isNaN(repsParts[0]!) ? 0 : repsParts[0]!;
        const rMax = repsParts.length > 1 && !isNaN(repsParts[1]!) ? repsParts[1]! : rMin;
        return { sets: ex.sets ?? 3, repsMin: rMin, repsMax: rMax };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Core scoring & selection
// ---------------------------------------------------------------------------

function scoreExercise(ex: Exercise, targetMuscles: string[]): number {
  let score = 0;
  const targetSet = new Set(targetMuscles.map((m) => m.toLowerCase()));

  // Category bonus
  if (ex.category === "compound") score += 10;
  else if (ex.category === "accessory") score += 3;
  else if (ex.category === "isolation") score += 1;

  // Primary muscle match
  for (const m of ex.primaryMuscles) {
    if (targetSet.has(m.toLowerCase())) score += 5;
  }

  // Secondary muscle match (smaller bonus)
  for (const m of ex.secondaryMuscles) {
    if (targetSet.has(m.toLowerCase())) score += 1;
  }

  // Stable sort tiebreaker
  if (ex.sortOrder != null) score += (1000 - ex.sortOrder) * 0.001;

  return score;
}

function selectExercisesForDay(
  allExercises: Exercise[],
  targetMuscles: string[],
  input: WorkoutPlanInput,
): Exercise[] {
  const levelRank = DIFFICULTY_RANK[input.experienceLevel] ?? 0;

  // Filter eligible exercises (main categories only)
  const eligible = allExercises.filter(
    (ex) =>
      ex.isActive &&
      (ex.category === "compound" ||
        ex.category === "accessory" ||
        ex.category === "isolation" ||
        ex.category === "cardio") &&
      (DIFFICULTY_RANK[ex.difficulty] ?? 0) <= levelRank &&
      !hasInjuryConflict(ex, input.injuries) &&
      equipmentAvailable(ex, input.availableEquipment),
  );

  // Score and sort
  const scored = eligible
    .map((ex) => ({ ex, score: scoreExercise(ex, targetMuscles) }))
    .sort((a, b) => b.score - a.score);

  // Determine count
  const range = EXERCISE_COUNTS[input.experienceLevel] ?? EXERCISE_COUNTS.intermediate!;
  let count = range.max;

  // Low adherence: reduce to 3-4 compounds only
  const lowAdherence = input.adherenceLevel != null && input.adherenceLevel < 50;
  if (lowAdherence) {
    const compounds = scored.filter((s) => s.ex.category === "compound");
    return compounds.slice(0, Math.min(4, Math.max(3, compounds.length))).map((s) => s.ex);
  }

  // Low energy or poor sleep: reduce volume by 20%
  const lowRecovery =
    (input.energyLevel != null && input.energyLevel < 5) ||
    (input.sleepQuality != null && input.sleepQuality < 5);
  if (lowRecovery) {
    count = Math.max(range.min - 1, Math.round(count * 0.8));
  }

  return scored.slice(0, count).map((s) => s.ex);
}

function selectWarmupExercises(
  allExercises: Exercise[],
  targetMuscles: string[],
  input: WorkoutPlanInput,
): Exercise[] {
  const targetSet = new Set(targetMuscles.map((m) => m.toLowerCase()));

  const warmups = allExercises.filter(
    (ex) =>
      ex.isActive &&
      ex.category === "warmup" &&
      !hasInjuryConflict(ex, input.injuries) &&
      equipmentAvailable(ex, input.availableEquipment),
  );

  // Prefer warmups that target today's muscles
  const sorted = warmups.sort((a, b) => {
    const aMatch = a.primaryMuscles.filter((m) => targetSet.has(m.toLowerCase())).length;
    const bMatch = b.primaryMuscles.filter((m) => targetSet.has(m.toLowerCase())).length;
    return bMatch - aMatch;
  });

  return sorted.slice(0, 3);
}

function selectCooldownExercises(
  allExercises: Exercise[],
  targetMuscles: string[],
  input: WorkoutPlanInput,
): Exercise[] {
  const targetSet = new Set(targetMuscles.map((m) => m.toLowerCase()));

  const cooldowns = allExercises.filter(
    (ex) =>
      ex.isActive &&
      ex.category === "cooldown" &&
      !hasInjuryConflict(ex, input.injuries) &&
      equipmentAvailable(ex, input.availableEquipment),
  );

  const sorted = cooldowns.sort((a, b) => {
    const aMatch = a.primaryMuscles.filter((m) => targetSet.has(m.toLowerCase())).length;
    const bMatch = b.primaryMuscles.filter((m) => targetSet.has(m.toLowerCase())).length;
    return bMatch - aMatch;
  });

  return sorted.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Build day
// ---------------------------------------------------------------------------

function buildTrainingDay(
  allExercises: Exercise[],
  targetMuscles: string[],
  dayLabel: string,
  input: WorkoutPlanInput,
): TrainingDay {
  const lang = input.language;
  // PHUL override: power days use strength params, hypertrophy days use hypertrophy params
  const labelLower = dayLabel.toLowerCase();
  const gp = labelLower.includes("power")
    ? GOAL_PARAMS.strength!
    : labelLower.includes("hypertrophy") || labelLower.includes("تضخيم")
      ? GOAL_PARAMS.hypertrophy!
      : goalParams(input.goal);

  const mainExercises = selectExercisesForDay(allExercises, targetMuscles, input);
  const warmups = selectWarmupExercises(allExercises, targetMuscles, input);
  const cooldowns = selectCooldownExercises(allExercises, targetMuscles, input);

  // Build workout exercises with sets/reps/rest
  const workoutExercises: WorkoutExercise[] = mainExercises.map((ex) => {
    let sets = gp.sets;
    let repsMin = gp.repsMin;
    let repsMax = gp.repsMax;
    let restSec = gp.restSeconds;

    // Use exercise defaults if they differ meaningfully from zero
    if (ex.defaultSets > 0 && ex.defaultRepsMin > 0) {
      // Blend: prefer goal params but respect exercise-specific rest
      restSec = ex.defaultRestSeconds > 0 ? ex.defaultRestSeconds : restSec;
    }

    // Progressive overload from previous plan
    const prev = findPreviousExercise(input.previousPlan, exerciseName(ex, lang));
    if (prev) {
      // Try to increment reps by 1-2
      const canAddReps = prev.repsMax + 2 <= gp.repsMax + 4; // allow slight overshoot
      if (canAddReps) {
        repsMin = Math.min(prev.repsMin + 1, repsMin + 4);
        repsMax = Math.min(prev.repsMax + 2, repsMax + 4);
      } else {
        // Cap reps reached: add 1 set instead
        sets = Math.min(prev.sets + 1, 6);
        repsMin = gp.repsMin;
        repsMax = gp.repsMax;
      }
    }

    const repsStr = repsMin === repsMax ? `${repsMin}` : `${repsMin}-${repsMax}`;

    return {
      name: exerciseName(ex, lang),
      exerciseDbId: ex._id,
      sets,
      reps: repsStr,
      restBetweenSets: `${restSec}s`,
      targetMuscles: ex.primaryMuscles,
      instructions: exerciseInstructions(ex, lang).slice(0, 2),
    };
  });

  // Warmup exercises
  const warmupList: WarmupCooldownExercise[] = warmups.map((ex) => ({
    name: exerciseName(ex, lang),
    exerciseDbId: ex._id,
    duration: ex.defaultRestSeconds > 0 ? ex.defaultRestSeconds : 30,
    instructions: exerciseInstructions(ex, lang).slice(0, 1),
  }));

  // Cooldown exercises
  const cooldownList: WarmupCooldownExercise[] = cooldowns.map((ex) => ({
    name: exerciseName(ex, lang),
    exerciseDbId: ex._id,
    duration: ex.defaultRestSeconds > 0 ? ex.defaultRestSeconds : 30,
    instructions: exerciseInstructions(ex, lang).slice(0, 1),
  }));

  // Estimate duration: warmup ~5min + exercises * (sets * ~1.5min) + cooldown ~5min
  const exerciseMins = workoutExercises.reduce((sum, ex) => sum + ex.sets * 1.5, 0);
  const duration = Math.round(5 + exerciseMins + 5);

  // Determine workout name
  const workoutName = lang === "ar" ? `تمرين ${dayLabel}` : `${dayLabel} Day`;

  return {
    workoutName,
    duration,
    targetMuscles,
    restDay: false as const,
    warmup: { exercises: warmupList },
    exercises: workoutExercises,
    cooldown: { exercises: cooldownList },
  };
}

function buildRestDay(lang: "en" | "ar"): RestDay {
  return {
    restDay: true as const,
    workoutName: lang === "ar" ? "يوم راحة" : "Rest Day",
  };
}

// ---------------------------------------------------------------------------
// Progression notes & safety tips
// ---------------------------------------------------------------------------

function generateProgressionNotes(input: WorkoutPlanInput): string {
  const { language: lang, experienceLevel, goal } = input;
  if (lang === "ar") {
    const goalText =
      goal.toLowerCase().includes("strength") || goal.includes("قوة")
        ? "زيادة الأوزان تدريجياً"
        : "زيادة التكرارات أو المجموعات تدريجياً";
    return `ركز على ${goalText} كل أسبوع. حافظ على الأداء الصحيح قبل زيادة الحمل.`;
  }
  const goalText = goal.toLowerCase().includes("strength")
    ? "increasing weight gradually"
    : "adding reps or sets progressively";
  return `Focus on ${goalText} each week. Maintain proper form before increasing load. ${
    experienceLevel === "beginner"
      ? "Master movement patterns first."
      : "Track your lifts to ensure consistent progress."
  }`;
}

function generateSafetyTips(input: WorkoutPlanInput): string[] {
  const { language: lang, injuries } = input;
  if (lang === "ar") {
    const tips = [
      "قم بالإحماء دائماً قبل التمرين",
      "اشرب الماء بانتظام أثناء التمرين",
      "توقف فوراً إذا شعرت بألم حاد",
      "حافظ على الأداء الصحيح في جميع التمارين",
    ];
    if (injuries.length > 0) {
      tips.push("تجنب التمارين التي تسبب ألماً في المناطق المصابة");
    }
    return tips;
  }
  const tips = [
    "Always warm up before training",
    "Stay hydrated throughout your workout",
    "Stop immediately if you feel sharp pain",
    "Maintain proper form on all exercises",
  ];
  if (injuries.length > 0) {
    tips.push(
      "Avoid exercises that cause pain in injured areas and consult your coach if discomfort persists",
    );
  }
  return tips;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic workout plan from exercise database entries.
 * Returns a JSON structure backward-compatible with the AI-generated format.
 */
export function generateWorkoutPlan(
  exercises: Exercise[],
  input: WorkoutPlanInput,
): WorkoutPlanOutput {
  const { split, planDuration, language: lang } = input;
  const dayLabels = lang === "ar" ? split.dayLabelsAr : split.dayLabels;

  const weeklyPlan: Record<string, TrainingDay | RestDay> = {};

  const numDays = Math.min(planDuration, dayLabels.length);

  for (let i = 0; i < numDays; i++) {
    const dayKey = `day${i + 1}`;
    const label = dayLabels[i]!;
    const targetMuscles = musclesForLabel(label);

    if (targetMuscles === null) {
      // Rest day
      weeklyPlan[dayKey] = buildRestDay(lang);
    } else {
      weeklyPlan[dayKey] = buildTrainingDay(
        exercises,
        targetMuscles,
        lang === "ar" ? split.dayLabelsAr[i]! : split.dayLabels[i]!,
        input,
      );
    }
  }

  return {
    splitType: split.splitType,
    splitName: lang === "ar" ? split.splitNameAr : split.splitName,
    splitDescription: lang === "ar" ? split.splitDescriptionAr : split.splitDescription,
    weeklyPlan,
    progressionNotes: generateProgressionNotes(input),
    safetyTips: generateSafetyTips(input),
  };
}

// ---------------------------------------------------------------------------
// Injury parser helper
// ---------------------------------------------------------------------------

/**
 * Extract injury-related strings from assessment and latest check-in data.
 * Returns a deduplicated array of injury keywords/descriptions.
 */
export function parseInjuries(
  assessment: any | null | undefined,
  latestCheckIn: any | null | undefined,
): string[] {
  const injuries = new Set<string>();

  // From assessment.injuries (string[])
  if (assessment?.injuries && Array.isArray(assessment.injuries)) {
    for (const injury of assessment.injuries) {
      if (typeof injury === "string" && injury.trim()) {
        injuries.add(injury.trim().toLowerCase());
      }
    }
  }

  // From assessment.medicalConditions that look injury-related
  if (assessment?.medicalConditions && Array.isArray(assessment.medicalConditions)) {
    const injuryKeywords = [
      "injury",
      "pain",
      "tear",
      "sprain",
      "strain",
      "fracture",
      "herniat",
      "disc",
      "tendon",
      "ligament",
      "surgery",
      "إصابة",
      "ألم",
      "تمزق",
      "كسر",
    ];
    for (const cond of assessment.medicalConditions) {
      if (typeof cond === "string") {
        const lower = cond.toLowerCase();
        if (injuryKeywords.some((kw) => lower.includes(kw))) {
          injuries.add(cond.trim().toLowerCase());
        }
      }
    }
  }

  // From latest check-in newInjuries (string)
  if (latestCheckIn?.newInjuries && typeof latestCheckIn.newInjuries === "string") {
    const raw = latestCheckIn.newInjuries.trim();
    if (raw) {
      // Split on commas or newlines
      for (const part of raw.split(/[,\n]+/)) {
        const trimmed = part.trim().toLowerCase();
        if (trimmed) injuries.add(trimmed);
      }
    }
  }

  return Array.from(injuries);
}
