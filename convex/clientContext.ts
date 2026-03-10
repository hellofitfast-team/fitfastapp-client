import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClientContext {
  profile: Doc<"profiles">;
  assessment: Doc<"initialAssessments"> | null;
  assessmentChanges: string[] | null;
  assessmentVersion: number;
  currentCheckIn: Doc<"checkIns"> | null;
  checkInHistory: Doc<"checkIns">[];
  adherence: {
    meal: { completed: number; total: number; rate: number } | null;
    workout: { completed: number; total: number; rate: number } | null;
  };
  recentReflections: Doc<"dailyReflections">[];
}

// ---------------------------------------------------------------------------
// Build full AI context for a client
// ---------------------------------------------------------------------------

export const buildClientContext = internalQuery({
  args: {
    userId: v.string(),
    checkInId: v.optional(v.id("checkIns")),
  },
  handler: async (ctx, { userId, checkInId }): Promise<ClientContext> => {
    // 1. Profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new Error("Profile not found");

    // 2. Current assessment
    const assessment = await ctx.db
      .query("initialAssessments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    // 3. Recent assessment changes (last version snapshot)
    const latestHistory = await ctx.db
      .query("assessmentHistory")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    // 4. Current check-in
    const currentCheckIn = checkInId ? await ctx.db.get(checkInId) : null;

    // 5. Historical check-ins (last 5, excluding current)
    const recentCheckIns = await ctx.db
      .query("checkIns")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(6);
    const checkInHistory = recentCheckIns
      .filter((c) => !checkInId || c._id !== checkInId)
      .slice(0, 5);

    // 6. Plan adherence from last cycle
    const lastMealPlan = await ctx.db
      .query("mealPlans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
    const lastWorkoutPlan = await ctx.db
      .query("workoutPlans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    let mealAdherence = null;
    if (lastMealPlan) {
      const completions = await ctx.db
        .query("mealCompletions")
        .withIndex("by_planId_date", (q) => q.eq("mealPlanId", lastMealPlan._id))
        .collect();
      if (completions.length > 0) {
        const completed = completions.filter((c) => c.completed).length;
        mealAdherence = {
          completed,
          total: completions.length,
          rate: Math.round((completed / completions.length) * 100),
        };
      }
    }

    let workoutAdherence = null;
    if (lastWorkoutPlan) {
      const completions = await ctx.db
        .query("workoutCompletions")
        .withIndex("by_planId_date", (q) => q.eq("workoutPlanId", lastWorkoutPlan._id))
        .collect();
      if (completions.length > 0) {
        const completed = completions.filter((c) => c.completed).length;
        workoutAdherence = {
          completed,
          total: completions.length,
          rate: Math.round((completed / completions.length) * 100),
        };
      }
    }

    // 7. Recent reflections (last 7)
    const recentReflections = await ctx.db
      .query("dailyReflections")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId))
      .order("desc")
      .take(7);

    return {
      profile,
      assessment,
      assessmentChanges: latestHistory?.changedFields ?? null,
      assessmentVersion: (latestHistory?.versionNumber ?? 0) + 1,
      currentCheckIn,
      checkInHistory,
      adherence: { meal: mealAdherence, workout: workoutAdherence },
      recentReflections: recentReflections.filter((r) => r.reflection),
    };
  },
});

// ---------------------------------------------------------------------------
// Input sanitization for AI prompts
// ---------------------------------------------------------------------------

/** Truncate and sanitize user-provided text before injecting into AI prompts. */
function sanitizeForPrompt(text: string, maxLen = 500): string {
  let sanitized = text.slice(0, maxLen);
  // Strip consecutive newlines (reduce prompt injection surface)
  sanitized = sanitized.replace(/\n{3,}/g, "\n\n");
  // Strip common prompt injection patterns
  sanitized = sanitized.replace(/^(system|assistant|user)\s*:/gim, "");
  sanitized = sanitized.replace(/ignore (?:all )?(?:previous |above )?instructions/gi, "");
  return sanitized.trim();
}

// ---------------------------------------------------------------------------
// Format context into a compact, token-efficient string for LLM prompts
// ---------------------------------------------------------------------------

export function formatContextForPrompt(ctx: ClientContext): string {
  const parts: string[] = [];
  const a = ctx.assessment;

  // ── Static data ──
  if (a) {
    parts.push(`GOALS: ${sanitizeForPrompt(a.goals || "", 300) || "Not specified"}`);
    parts.push(`BODY: ${a.currentWeight}kg, ${a.height}cm`);
    parts.push(`AGE: ${a.age || "Not specified"}`);
    parts.push(`GENDER: ${a.gender || "Not specified"}`);
    // Female health data (collected during assessment)
    if (a.gender === "female" && a.femaleHealth) {
      const fh = a.femaleHealth as {
        menstrualStatus?: string;
        isPregnant?: boolean;
        isBreastfeeding?: boolean;
        hormonalMedication?: string;
        notes?: string;
      };
      const fhParts: string[] = [];
      if (fh.menstrualStatus && fh.menstrualStatus !== "prefer_not_say")
        fhParts.push(`Cycle: ${fh.menstrualStatus}`);
      if (fh.isPregnant) fhParts.push("PREGNANT");
      if (fh.isBreastfeeding) fhParts.push("Breastfeeding");
      if (fh.hormonalMedication)
        fhParts.push(`Hormonal meds: ${sanitizeForPrompt(fh.hormonalMedication, 100)}`);
      if (fh.notes) fhParts.push(`Notes: ${sanitizeForPrompt(fh.notes, 200)}`);
      if (fhParts.length > 0) parts.push(`FEMALE HEALTH: ${fhParts.join(", ")}`);
    }
    parts.push(`EXPERIENCE: ${a.experienceLevel || "Not specified"}`);
    parts.push(`SCHEDULE: ${JSON.stringify(a.scheduleAvailability || {})}`);
    parts.push(
      `CUISINE PREFERENCES: ${a.foodPreferences?.map((x) => sanitizeForPrompt(x, 100)).join(", ") || "None"}`,
    );
    parts.push(
      `ALLERGIES: ${a.allergies?.map((x) => sanitizeForPrompt(x, 100)).join(", ") || "None"}`,
    );
    parts.push(
      `DIETARY RESTRICTIONS: ${a.dietaryRestrictions?.map((x) => sanitizeForPrompt(x, 100)).join(", ") || "None"}`,
    );
    parts.push(
      `MEDICAL CONDITIONS: ${a.medicalConditions?.map((x) => sanitizeForPrompt(x, 100)).join(", ") || "None"}`,
    );
    parts.push(
      `INJURIES: ${a.injuries?.map((x) => sanitizeForPrompt(x, 100)).join(", ") || "None"}`,
    );
    if (a.lifestyleHabits) {
      const habits = a.lifestyleHabits as Record<string, unknown>;
      if (habits.equipment)
        parts.push(`EQUIPMENT: ${sanitizeForPrompt(String(habits.equipment), 200)}`);
      if (habits.mealsPerDay) parts.push(`MEALS PER DAY: ${habits.mealsPerDay}`);
    }
  }

  // ── Assessment changes (if reassessment happened) ──
  if (ctx.assessmentChanges?.length) {
    parts.push(`\nRECENT ASSESSMENT CHANGES: ${ctx.assessmentChanges.join(", ")}`);
  }

  // ── Weight trend (progressive) ──
  const allCheckIns = [ctx.currentCheckIn, ...ctx.checkInHistory].filter(
    (c): c is Doc<"checkIns"> => c != null && c.weight != null,
  );
  if (allCheckIns.length > 1) {
    const trend = allCheckIns
      .reverse()
      .map((c) => `${new Date(c._creationTime).toISOString().split("T")[0]}: ${c.weight}kg`);
    parts.push(`\nWEIGHT TREND: ${trend.join(" → ")}`);
  }

  // ── Averages from check-in history ──
  const energyVals = allCheckIns.filter((c) => c.energyLevel != null).map((c) => c.energyLevel!);
  const sleepVals = allCheckIns.filter((c) => c.sleepQuality != null).map((c) => c.sleepQuality!);
  if (energyVals.length > 0) {
    const avg = (arr: number[]) =>
      Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
    parts.push(
      `AVG ENERGY: ${avg(energyVals)}/10 | AVG SLEEP: ${avg(sleepVals)}/10 (last ${energyVals.length} check-ins)`,
    );
  }

  // ── Current check-in snapshot ──
  if (ctx.currentCheckIn) {
    const ci = ctx.currentCheckIn;
    const ciParts = [`Weight ${ci.weight}kg`];
    if (ci.energyLevel != null) ciParts.push(`Energy ${ci.energyLevel}/10`);
    if (ci.sleepQuality != null) ciParts.push(`Sleep ${ci.sleepQuality}/10`);
    if (ci.dietaryAdherence != null) ciParts.push(`Diet adherence ${ci.dietaryAdherence}/10`);
    parts.push(`\nCURRENT CHECK-IN: ${ciParts.join(", ")}`);
    if (ci.workoutPerformance)
      parts.push(`WORKOUT FEEDBACK: ${sanitizeForPrompt(ci.workoutPerformance)}`);
    if (ci.newInjuries) parts.push(`NEW INJURIES: ${sanitizeForPrompt(ci.newInjuries)}`);
    if (ci.notes) parts.push(`CLIENT NOTES: ${sanitizeForPrompt(ci.notes)}`);
    if ((ci as any).cyclePhase && (ci as any).cyclePhase !== "not_tracking")
      parts.push(`CURRENT CYCLE PHASE: ${(ci as any).cyclePhase}`);
  }

  // ── Adherence data ──
  if (ctx.adherence.meal) {
    parts.push(
      `\nLAST CYCLE MEAL ADHERENCE: ${ctx.adherence.meal.rate}% (${ctx.adherence.meal.completed}/${ctx.adherence.meal.total})`,
    );
  }
  if (ctx.adherence.workout) {
    parts.push(
      `LAST CYCLE WORKOUT ADHERENCE: ${ctx.adherence.workout.rate}% (${ctx.adherence.workout.completed}/${ctx.adherence.workout.total})`,
    );
  }

  // ── Recent reflections (compact) ──
  const reflections = ctx.recentReflections
    .filter((r) => r.reflection)
    .map((r) => `${r.date}: ${sanitizeForPrompt(r.reflection!, 80)}`);
  if (reflections.length > 0) {
    parts.push(`\nRECENT REFLECTIONS:\n${reflections.join("\n")}`);
  }

  return parts.join("\n");
}
