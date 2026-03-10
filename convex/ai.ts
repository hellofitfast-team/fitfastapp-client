"use node";

import { v } from "convex/values";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "./auth";
import { type ClientContext, formatContextForPrompt } from "./clientContext";
import { calculateNutritionTargets, type NutritionTargets } from "./nutritionEngine";
import { selectWorkoutSplit, type WorkoutSplit } from "./workoutSplitEngine";
import { generateWorkoutPlan as buildWorkoutPlan, parseInjuries } from "./workoutPlanEngine";
import { getRagClient } from "./ragManager";
import {
  MEAL_OUTPUT_TOKENS_EN,
  MEAL_OUTPUT_TOKENS_AR,
  WORKOUT_OUTPUT_TOKENS_EN,
  WORKOUT_OUTPUT_TOKENS_AR,
  PLAN_GENERATION_TIMEOUT_MS,
  PLAN_GENERATION_MAX_RETRIES,
} from "./constants";

// ---------------------------------------------------------------------------
// AI Model Configuration
// ---------------------------------------------------------------------------

/** Primary plan generation model — direct Google API (no OpenRouter routing overhead) */
const PLAN_MODEL_PRIMARY = "gemini-2.5-flash-lite";
/** Fallback model — direct DeepSeek API, used when primary is congested/unavailable */
const PLAN_MODEL_FALLBACK = "deepseek-chat";

// ---------------------------------------------------------------------------
// Robust JSON extraction & repair
// ---------------------------------------------------------------------------

/**
 * Attempts to extract and parse a JSON object from potentially messy LLM output.
 * Handles: markdown fences, leading/trailing text, trailing commas, truncated JSON.
 */
function extractJSON(raw: string): Record<string, unknown> {
  // 1. Strip markdown code fences
  let text = raw.replace(/```(?:json)?\s*\n?/g, "").trim();

  // 2. Extract the outermost { ... } if surrounded by extra text
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  // 3. Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // continue to repairs
  }

  // 4. Fix trailing commas before } or ] (common LLM mistake)
  let repaired = text.replace(/,\s*([\]}])/g, "$1");

  try {
    return JSON.parse(repaired);
  } catch {
    // continue
  }

  // 5. Handle truncated JSON: try closing open brackets/braces
  repaired = repaired.trimEnd();
  // Count unmatched openers
  let braces = 0,
    brackets = 0;
  let inString = false,
    escaped = false;
  for (const ch of repaired) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") braces++;
    else if (ch === "}") braces--;
    else if (ch === "[") brackets++;
    else if (ch === "]") brackets--;
  }
  // If we're inside a string, close it
  if (inString) repaired += '"';
  // Close unmatched brackets/braces
  for (let i = 0; i < brackets; i++) repaired += "]";
  for (let i = 0; i < braces; i++) repaired += "}";

  // Remove any trailing commas that appeared before our closers
  repaired = repaired.replace(/,\s*([\]}])/g, "$1");

  return JSON.parse(repaired); // let this throw if still broken
}

// ---------------------------------------------------------------------------
// Post-generation validation & auto-correction
// ---------------------------------------------------------------------------

interface ValidationWarning {
  type:
    | "macro_mismatch"
    | "below_minimum_calories"
    | "zero_value"
    | "missing_exercises"
    | "missing_warmup_cooldown"
    | "totals_corrected"
    | "alt_macro_scaled";
  day?: string;
  message: string;
}

function validateAndCorrectMealPlan(
  planData: Record<string, unknown>,
  nutritionTargets: NutritionTargets,
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const weeklyPlan = planData.weeklyPlan as Record<string, any> | undefined;
  if (!weeklyPlan || typeof weeklyPlan !== "object") return warnings;

  for (const [dayKey, dayData] of Object.entries(weeklyPlan)) {
    if (!dayData?.meals || !Array.isArray(dayData.meals)) continue;

    // Sum actual meal macros
    let sumCalories = 0,
      sumProtein = 0,
      sumCarbs = 0,
      sumFat = 0;
    for (const meal of dayData.meals) {
      if (!meal || typeof meal !== "object") continue;
      sumCalories += Number(meal.calories) || 0;
      sumProtein += Number(meal.protein) || 0;
      sumCarbs += Number(meal.carbs) || 0;
      sumFat += Number(meal.fat) || 0;

      // Flag zero-value meals
      if ((Number(meal.calories) || 0) === 0) {
        warnings.push({
          type: "zero_value",
          day: dayKey,
          message: `Meal "${meal.name}" has 0 calories`,
        });
      }
      if ((Number(meal.protein) || 0) === 0) {
        warnings.push({
          type: "zero_value",
          day: dayKey,
          message: `Meal "${meal.name}" has 0 protein`,
        });
      }

      // Validate and correct alternatives' macros
      if (Array.isArray(meal.alternatives)) {
        const mealCal = Number(meal.calories) || 0;
        for (const alt of meal.alternatives) {
          if (!alt || typeof alt !== "object") continue;
          // Per-alternative macro cross-check: P*4 + C*4 + F*9 should ≈ claimed calories
          const altCal = Number(alt.calories) || 0;
          const computedAltCal =
            (Number(alt.protein) || 0) * 4 +
            (Number(alt.carbs) || 0) * 4 +
            (Number(alt.fat) || 0) * 9;
          if (altCal > 0 && Math.abs(computedAltCal - altCal) > 30) {
            alt.calories = Math.round(computedAltCal);
          }
          // Scale alternative if >10% off from parent meal calories
          const correctedAltCal = Number(alt.calories) || 0;
          if (mealCal > 0 && correctedAltCal > 0) {
            const altDiff = Math.abs(correctedAltCal - mealCal) / mealCal;
            if (altDiff > 0.1) {
              const altScale = mealCal / correctedAltCal;
              alt.calories = Math.round(correctedAltCal * altScale);
              alt.protein = Math.round((Number(alt.protein) || 0) * altScale);
              alt.carbs = Math.round((Number(alt.carbs) || 0) * altScale);
              alt.fat = Math.round((Number(alt.fat) || 0) * altScale);
              warnings.push({
                type: "alt_macro_scaled",
                day: dayKey,
                message: `Alt "${alt.name}" for "${meal.name}" scaled by ${altScale.toFixed(2)}x to match meal calories`,
              });
            }
          }
        }
      }
    }

    // Auto-correct dailyTotals to match actual meal sums
    const existingTotals = dayData.dailyTotals;
    const correctedTotals = {
      calories: Math.round(sumCalories),
      protein: Math.round(sumProtein),
      carbs: Math.round(sumCarbs),
      fat: Math.round(sumFat),
    };

    if (
      existingTotals &&
      (Math.abs(existingTotals.calories - sumCalories) > 1 ||
        Math.abs(existingTotals.protein - sumProtein) > 1)
    ) {
      warnings.push({
        type: "totals_corrected",
        day: dayKey,
        message: `dailyTotals corrected: was ${existingTotals.calories}cal/${existingTotals.protein}p, actual sum ${correctedTotals.calories}cal/${correctedTotals.protein}p`,
      });
    }
    dayData.dailyTotals = correctedTotals;

    // Per-meal macro cross-check: P*4 + C*4 + F*9 should ≈ claimed calories
    for (const meal of dayData.meals) {
      if (!meal || typeof meal !== "object") continue;
      const mealCal = Number(meal.calories) || 0;
      const computedCal =
        (Number(meal.protein) || 0) * 4 +
        (Number(meal.carbs) || 0) * 4 +
        (Number(meal.fat) || 0) * 9;
      if (mealCal > 0 && Math.abs(computedCal - mealCal) > 30) {
        meal.calories = Math.round(computedCal);
        warnings.push({
          type: "macro_mismatch",
          day: dayKey,
          message: `Meal "${meal.name}" calories corrected: claimed ${mealCal}, macro sum ${Math.round(computedCal)}`,
        });
      }
    }

    // Recalculate after per-meal corrections
    sumCalories = 0;
    sumProtein = 0;
    sumCarbs = 0;
    sumFat = 0;
    for (const meal of dayData.meals) {
      if (!meal || typeof meal !== "object") continue;
      sumCalories += Number(meal.calories) || 0;
      sumProtein += Number(meal.protein) || 0;
      sumCarbs += Number(meal.carbs) || 0;
      sumFat += Number(meal.fat) || 0;
    }
    dayData.dailyTotals = {
      calories: Math.round(sumCalories),
      protein: Math.round(sumProtein),
      carbs: Math.round(sumCarbs),
      fat: Math.round(sumFat),
    };

    // Check if day is significantly off from nutrition targets
    const calorieDiff =
      Math.abs(sumCalories - nutritionTargets.calories) / nutritionTargets.calories;
    if (calorieDiff > 0.1 && sumCalories > 0) {
      // Scale at daily level first: preserve protein ratio, scale fat, derive carbs from remainder
      const scaleFactor = nutritionTargets.calories / sumCalories;
      const scaledProtein = Math.round(sumProtein * scaleFactor);
      const scaledFat = Math.round(sumFat * scaleFactor);
      // Derive carbs from calorie remainder to avoid cumulative rounding errors
      const scaledCarbs = Math.round(
        (nutritionTargets.calories - scaledProtein * 4 - scaledFat * 9) / 4,
      );

      // Distribute proportionally to meals
      for (const meal of dayData.meals) {
        if (!meal || typeof meal !== "object") continue;
        meal.calories = Math.round((Number(meal.calories) || 0) * scaleFactor);
        meal.protein = Math.round((Number(meal.protein) || 0) * scaleFactor);
        meal.carbs = Math.round((Number(meal.carbs) || 0) * scaleFactor);
        meal.fat = Math.round((Number(meal.fat) || 0) * scaleFactor);
      }
      dayData.dailyTotals = {
        calories: nutritionTargets.calories,
        protein: scaledProtein,
        carbs: scaledCarbs,
        fat: scaledFat,
      };
      warnings.push({
        type: "totals_corrected",
        day: dayKey,
        message: `Day calories ${Math.round(sumCalories)} were ${Math.round(calorieDiff * 100)}% off — portions scaled by ${scaleFactor.toFixed(2)}x`,
      });
    } else if (calorieDiff > 0.05) {
      warnings.push({
        type: "macro_mismatch",
        day: dayKey,
        message: `Day calories ${Math.round(sumCalories)} are ${Math.round(calorieDiff * 100)}% off from target ${nutritionTargets.calories}`,
      });
    }

    // Check minimum calorie floor
    if (sumCalories > 0 && sumCalories < nutritionTargets.minCalories) {
      warnings.push({
        type: "below_minimum_calories",
        day: dayKey,
        message: `Day calories ${Math.round(sumCalories)} below safe minimum ${nutritionTargets.minCalories}`,
      });
    }
  }

  return warnings;
}

function validateWorkoutPlan(planData: Record<string, unknown>): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const weeklyPlan = planData.weeklyPlan as Record<string, any> | undefined;
  if (!weeklyPlan || typeof weeklyPlan !== "object") return warnings;

  for (const [dayKey, dayData] of Object.entries(weeklyPlan)) {
    if (!dayData || typeof dayData !== "object") continue;

    const isRestDay = dayData.restDay === true;

    if (!isRestDay) {
      // Training day checks
      if (
        !dayData.exercises ||
        !Array.isArray(dayData.exercises) ||
        dayData.exercises.length === 0
      ) {
        warnings.push({
          type: "missing_exercises",
          day: dayKey,
          message: `Training day "${dayData.workoutName}" has no exercises`,
        });
      }
      if (!dayData.warmup?.exercises?.length) {
        warnings.push({
          type: "missing_warmup_cooldown",
          day: dayKey,
          message: `Training day "${dayData.workoutName}" missing warmup`,
        });
      }
      if (!dayData.cooldown?.exercises?.length) {
        warnings.push({
          type: "missing_warmup_cooldown",
          day: dayKey,
          message: `Training day "${dayData.workoutName}" missing cooldown`,
        });
      }
    }
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// RAG context helper — searches coach knowledge base for relevant guidance
// ---------------------------------------------------------------------------

async function getCoachKnowledgeContext(
  ctx: ActionCtx,
  assessment: {
    goals?: string | null;
    dietaryRestrictions?: string[] | null;
    foodPreferences?: string[] | null;
    experienceLevel?: string | null;
  },
  planType: "meal" | "workout",
): Promise<string> {
  const contextParts = [
    assessment.goals,
    assessment.dietaryRestrictions?.join(", "),
    assessment.foodPreferences?.join(", "),
    assessment.experienceLevel,
  ].filter(Boolean);

  if (contextParts.length === 0) return "";

  const clientContext = contextParts.join("; ");

  // Filter by relevant tags so meal prompts get nutrition docs and workout prompts get training docs
  const tags = planType === "meal" ? ["nutrition", "general"] : ["workout", "recovery", "general"];
  const filters = tags.map((tag) => ({ name: "tag" as const, value: tag }));

  try {
    // Use text search (keyword-based) — no embedding API call, zero hang risk.
    // Coach knowledge base is small (<100 entries), so keyword matching on
    // tags + content is sufficient and eliminates the OpenRouter embed() bottleneck.
    const rag = getRagClient();
    const searchResult = await rag.search(ctx, {
      namespace: "coach_knowledge",
      query: clientContext,
      limit: 5,
      filters,
      searchType: "text",
    });

    const chunks = searchResult.results.map((r) => r.content.map((c) => c.text).join("\n"));
    if (chunks.length === 0) return "";

    return `\nCOACH'S TRAINING PHILOSOPHY & GUIDELINES:\n${chunks.join("\n\n")}`;
  } catch {
    // Knowledge base empty or not initialized — continue without RAG context
    return "";
  }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Fetch client context with a single retry — when triggered from assessment
 * submission via scheduler.runAfter(0), the assessment may not yet be visible
 * in the action's read snapshot.
 */
async function fetchClientContextWithRetry(
  ctx: ActionCtx,
  userId: string,
  checkInId?: Id<"checkIns">,
): Promise<ClientContext> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1500;

  let clientCtx: ClientContext = await ctx.runQuery(internal.clientContext.buildClientContext, {
    userId,
    checkInId,
  });

  // Retry with backoff — assessment may not be visible in the action's read snapshot yet
  for (let attempt = 1; attempt <= MAX_RETRIES && !clientCtx.assessment; attempt++) {
    console.warn(
      `[AI] Assessment not found for user ${userId} (attempt ${attempt}/${MAX_RETRIES}), retrying in ${RETRY_DELAY_MS}ms...`,
    );
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    clientCtx = await ctx.runQuery(internal.clientContext.buildClientContext, {
      userId,
      checkInId,
    });
  }

  if (!clientCtx.assessment)
    throw new Error("Please complete your initial assessment before generating a plan.");

  return clientCtx;
}

// ---------------------------------------------------------------------------
// Demo mode — mock meal plan when no AI API keys are configured
// ---------------------------------------------------------------------------

async function generateDemoMealPlan(
  ctx: ActionCtx,
  {
    userId,
    checkInId,
    language,
    safeDuration,
    clientCtx,
  }: {
    userId: string;
    checkInId?: Id<"checkIns">;
    language: "en" | "ar";
    safeDuration: number;
    clientCtx: ClientContext;
  },
): Promise<Id<"mealPlans">> {
  const assessment = clientCtx.assessment!;
  const isArabic = language === "ar";
  const nutritionTargets = calculateNutritionTargets({
    weightKg: assessment.currentWeight ?? 75,
    heightCm: assessment.height ?? 170,
    age: assessment.age ?? 30,
    gender: assessment.gender === "female" ? "female" : "male",
    trainingDaysPerWeek: Math.max(1, (assessment.scheduleAvailability as any)?.days?.length ?? 4),
    goal: assessment.goals?.split(",")[0]?.trim() ?? "general_fitness",
    activityLevel: (assessment as any).activityLevel ?? undefined,
  });

  const makeMeal = (name: string, nameAr: string, type: string, calPct: number) => {
    const cal = Math.round(nutritionTargets.calories * calPct);
    const pro = Math.round(nutritionTargets.protein * calPct);
    const carb = Math.round(nutritionTargets.carbs * calPct);
    const fat = Math.round(nutritionTargets.fat * calPct);
    return {
      name: isArabic ? nameAr : name,
      type,
      calories: cal,
      protein: pro,
      carbs: carb,
      fat,
      ingredients: isArabic
        ? ["بيض - 3 حبات", "خبز بلدي - 1", "جبنة بيضاء - 50 جم"]
        : ["3 eggs", "1 baladi bread", "50g white cheese"],
      instructions: isArabic ? ["اطبخ المكونات حسب الرغبة"] : ["Cook ingredients as preferred"],
      alternatives: [
        {
          name: isArabic ? "بديل 1" : "Alternative 1",
          type,
          calories: cal,
          protein: pro,
          carbs: carb,
          fat,
          ingredients: isArabic
            ? ["شوفان - 60 جم", "لبن - 200 مل", "موز - 1"]
            : ["60g oats", "200ml milk", "1 banana"],
          instructions: isArabic ? ["اخلط المكونات"] : ["Mix ingredients"],
        },
        {
          name: isArabic ? "بديل 2" : "Alternative 2",
          type,
          calories: cal,
          protein: pro,
          carbs: carb,
          fat,
          ingredients: isArabic
            ? ["فول - 200 جم", "طحينة - 1 م.ك", "خبز - 1"]
            : ["200g fava beans", "1 tbsp tahini", "1 bread"],
          instructions: isArabic ? ["سخن الفول وقدمه"] : ["Heat beans and serve"],
        },
        {
          name: isArabic ? "بديل 3" : "Alternative 3",
          type,
          calories: cal,
          protein: pro,
          carbs: carb,
          fat,
          ingredients: isArabic
            ? ["زبادي يوناني - 200 جم", "عسل - 1 م.ك", "مكسرات - 30 جم"]
            : ["200g Greek yogurt", "1 tbsp honey", "30g nuts"],
          instructions: isArabic ? ["اخلط وقدم"] : ["Mix and serve"],
        },
      ],
    };
  };

  const weeklyPlan: Record<string, unknown> = {};
  for (let d = 1; d <= safeDuration; d++) {
    weeklyPlan[`day${d}`] = {
      dailyTotals: {
        calories: nutritionTargets.calories,
        protein: nutritionTargets.protein,
        carbs: nutritionTargets.carbs,
        fat: nutritionTargets.fat,
      },
      meals: [
        makeMeal("Breakfast", "فطور", "breakfast", 0.25),
        makeMeal("Morning Snack", "سناك صباحي", "snack", 0.1),
        makeMeal("Lunch", "غداء", "lunch", 0.3),
        makeMeal("Afternoon Snack", "سناك مسائي", "snack", 0.1),
        makeMeal("Dinner", "عشاء", "dinner", 0.25),
      ],
    };
  }

  const planData = {
    dailyTargets: {
      calories: nutritionTargets.calories,
      protein: nutritionTargets.protein,
      carbs: nutritionTargets.carbs,
      fat: nutritionTargets.fat,
    },
    weeklyPlan,
    notes: isArabic
      ? "⚠️ خطة تجريبية — سيتم إنشاء خطة مخصصة بالذكاء الاصطناعي عند تفعيل المفتاح"
      : "⚠️ Demo plan — a personalized AI plan will be generated once API keys are configured",
  };

  const streamId: string = await ctx.runMutation(internal.streamingManager.createStream, {});
  await ctx.runMutation(internal.streamingManager.appendChunk, {
    streamId,
    text: JSON.stringify(planData),
    final: true,
  });

  const startDate = new Date().toISOString().split("T")[0]!;
  const endDate = new Date(Date.now() + safeDuration * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]!;

  return ctx.runMutation(internal.mealPlans.savePlanInternal, {
    userId,
    checkInId,
    planData,
    streamId,
    language,
    startDate,
    endDate,
    assessmentVersion: clientCtx.assessmentVersion,
  });
}

// ---------------------------------------------------------------------------
// Shared generation logic
// ---------------------------------------------------------------------------

async function generateMealPlanHandler(
  ctx: ActionCtx,
  {
    userId,
    checkInId,
    language,
    planDuration,
  }: {
    userId: string;
    checkInId?: Id<"checkIns">;
    language: "en" | "ar";
    planDuration: number;
  },
): Promise<Id<"mealPlans">> {
  // Defense in depth: ensure planDuration is always at least 1
  const safeDuration = Math.max(planDuration, 1);

  // --- DEMO MODE: skip AI when no API keys are configured ---
  const hasGoogleKey = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const hasDeepSeekKey = !!process.env.DEEPSEEK_API_KEY;
  if (!hasGoogleKey && !hasDeepSeekKey) {
    console.warn(
      `[AI] DEMO MODE: No AI API keys configured — generating mock meal plan for user ${userId}`,
    );
    const clientCtx = await fetchClientContextWithRetry(ctx, userId, checkInId);
    return generateDemoMealPlan(ctx, { userId, checkInId, language, safeDuration, clientCtx });
  }

  const clientCtx = await fetchClientContextWithRetry(ctx, userId, checkInId);

  // Pre-calculate nutrition targets deterministically
  const startTime = Date.now();
  const assessment = clientCtx.assessment!;
  const scheduleData = assessment.scheduleAvailability as { days?: string[] } | null;
  const trainingDays = Math.max(1, scheduleData?.days?.length ?? 4);
  console.log(
    `[AI] Generating meal plan for user ${userId} (${language}), training days: ${trainingDays}`,
  );

  // Validate anthropometric data with safe ranges — use defaults if out of range
  let weightKg = assessment.currentWeight ?? 75;
  let heightCm = assessment.height ?? 170;
  let age = assessment.age ?? 30;
  if (weightKg < 30 || weightKg > 300) {
    console.warn(
      `[AI] Weight ${weightKg}kg out of range (30-300) for user ${userId}, using default 75kg`,
    );
    weightKg = 75;
  }
  if (heightCm < 100 || heightCm > 250) {
    console.warn(
      `[AI] Height ${heightCm}cm out of range (100-250) for user ${userId}, using default 170cm`,
    );
    heightCm = 170;
  }
  if (age < 13 || age > 120) {
    console.warn(`[AI] Age ${age} out of range (13-120) for user ${userId}, using default 30`);
    age = 30;
  }

  const nutritionTargets: NutritionTargets = calculateNutritionTargets({
    weightKg,
    heightCm,
    age,
    gender: assessment.gender === "female" ? "female" : "male",
    trainingDaysPerWeek: trainingDays,
    goal: assessment.goals?.split(",")[0]?.trim() ?? "general_fitness",
    activityLevel: (assessment as any).activityLevel ?? undefined,
  });

  // Fetch coach knowledge context via RAG (filtered to nutrition/general docs)
  const knowledgeSection = await getCoachKnowledgeContext(ctx, assessment, "meal");

  // Fetch food database reference (cached 1h — rarely changes)
  const foodReference: string = await ctx.runAction(
    internal.actionCache.getFoodReferenceCached,
    {},
  );

  const { google } = await import("@ai-sdk/google");
  const { createDeepSeek } = await import("@ai-sdk/deepseek");
  const { generateText, streamText } = await import("ai");
  const isArabic = language === "ar";

  const contextBlock = formatContextForPrompt(clientCtx);
  const isFemale = assessment.gender === "female";

  // Female-specific nutritional guidelines injected when client is female
  const femaleNutritionBlock = isFemale
    ? `
FEMALE-SPECIFIC NUTRITION GUIDELINES (MANDATORY for this client):
- IRON: Include iron-rich foods daily (red meat 2-3x/week, lentils, spinach, molasses, fortified cereals). Pair with vitamin C sources (lemon, tomato, bell pepper) to boost absorption. Menstrual blood loss increases iron needs to ~18mg/day.
- CALCIUM & VITAMIN D: Target 1000mg calcium/day — include dairy (yogurt, labneh, white cheese), tahini, sardines, or fortified alternatives. Recommend sun exposure or supplementation note for vitamin D.
- FOLATE: Include folate-rich foods (dark leafy greens, lentils, chickpeas, fortified grains) — important for women of reproductive age.
- HORMONAL CYCLE AWARENESS: During luteal phase (days 15-28), women may experience increased appetite and cravings — include slightly more complex carbs and magnesium-rich foods (dark chocolate, nuts, bananas) to manage PMS symptoms.
- BLOATING & PMS: Include anti-inflammatory foods (ginger, turmeric, omega-3 from fish/flaxseed), limit excess sodium during premenstrual days, and include potassium-rich foods (bananas, sweet potatoes, avocado).
- BONE HEALTH: Prioritize weight-bearing exercise support nutrition — adequate protein + calcium + vitamin K (leafy greens).
- NEVER assume pregnancy. Do NOT provide pregnancy-specific dietary advice unless the client's medical conditions explicitly mention pregnancy.
- If client notes mention pregnancy or breastfeeding in their medical conditions, add a prominent disclaimer: "Consult your OB-GYN before following any diet plan during pregnancy or breastfeeding."
`
    : "";

  const systemPrompt = `You are an expert sports nutritionist and meal planning AI specializing in ${isArabic ? "Middle Eastern and Egyptian cuisine" : "international cuisine"}. Create personalized meal plans.
HARD CONSTRAINT: All meals MUST be halal. Never include pork, alcohol, or non-halal meat. This is non-negotiable.

NUTRITION CONSTRAINTS (calculated from client data via Mifflin-St Jeor — DO NOT deviate):
- Daily calories: ${nutritionTargets.calories} kcal (TDEE: ${nutritionTargets.tdee}, BMR: ${nutritionTargets.bmr})
- Protein: ${nutritionTargets.protein}g (${nutritionTargets.proteinPerKg}g/kg body weight)
- Carbs: ${nutritionTargets.carbs}g
- Fat: ${nutritionTargets.fat}g
- Each day's meals MUST sum to these daily totals (±5% tolerance)
- CRITICAL: Do NOT round or simplify calorie targets to "nice" numbers. Use the EXACT values above.
- Macro cross-check: Protein(g)×4 + Carbs(g)×4 + Fat(g)×9 must equal total calories for each meal (±30 cal tolerance)
- MINIMUM daily calories: ${nutritionTargets.minCalories} kcal — NEVER go below this
- Distribute calories across 4-5 meals (breakfast, snack, lunch, snack, dinner)
${femaleNutritionBlock}
Egyptian/MENA Staple Foods (prefer these when culturally appropriate):
- Proteins: eggs, chicken breast, beef, lentils, fava beans (foul), white cheese, labneh, Greek yogurt
- Carbs: baladi bread, rice, sweet potato, oats, freekeh, couscous
- Fats: olive oil, tahini, nuts, avocado
- Vegetables: tomatoes, cucumber, molokhia, bamia, eggplant, peppers

GUIDELINES:
1. Consider food preferences, allergies, and dietary restrictions
2. Each meal must have accurate macros that sum to the daily totals above
3. Use locally available, affordable ingredients
4. Include specific measurements (grams, cups, tablespoons) and cooking instructions with times/temperatures
5. Each meal MUST have exactly 3 alternatives with matching macros (±10% calories each)
6. If adherence data is provided, adjust meal complexity accordingly
7. If weight trend shows stall (>2 weeks same weight on fat loss), slightly increase protein and reduce carbs
8. Vary meals across days — avoid repeating the same meal more than twice per week
${isArabic ? "ALL content MUST be in Arabic language. Focus on Egyptian/Middle Eastern cuisine." : ""}${knowledgeSection}
${foodReference}
IMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, just raw JSON.`;

  const mealOutputTokens = isArabic ? MEAL_OUTPUT_TOKENS_AR : MEAL_OUTPUT_TOKENS_EN;

  const userPrompt = `Create a ${safeDuration}-day meal plan ${isArabic ? "ENTIRELY IN ARABIC" : "in English"}:

CLIENT PROFILE:
${contextBlock}

DAILY NUTRITION TARGETS: ${nutritionTargets.calories} kcal | ${nutritionTargets.protein}g protein | ${nutritionTargets.carbs}g carbs | ${nutritionTargets.fat}g fat

Be concise — short ingredient lists (3-5 per meal), 1-2 instruction steps, 3 alternatives per meal.

Return a JSON object with this structure:
{
  "dailyTargets": { "calories": number, "protein": number, "carbs": number, "fat": number },
  "weeklyPlan": {
    "day1": {
      "dailyTotals": { "calories": number, "protein": number, "carbs": number, "fat": number },
      "meals": [
        {
          "name": "string",
          "type": "breakfast|snack|lunch|dinner",
          "calories": number, "protein": number, "carbs": number, "fat": number,
          "ingredients": ["string with amount"],
          "instructions": ["step with time/temp"],
          "alternatives": [{ same fields as meal, without alternatives }]  // exactly 3 alternatives per meal
        }
      ]
    },
    ...up to "day${safeDuration}"
  },
  "notes": "string"
}
Each meal MUST have: name, type, calories, protein, carbs, fat, ingredients, instructions, alternatives (exactly 3 per meal, each with ±10% calorie match).
Keep instructions to 1-2 steps with cooking times. Keep ingredient lists to 3-5 items.
Daily meal macros MUST sum to the targets above (±5% tolerance). Respond ONLY with valid JSON.`;

  // Create stream for live progress
  const streamId: string = await ctx.runMutation(internal.streamingManager.createStream, {});

  // --- Attempt with primary model (direct Google) + fallback (direct DeepSeek) ---
  const halfTimeout = PLAN_GENERATION_TIMEOUT_MS / 2;
  const generateParams = {
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.4,
    maxOutputTokens: mealOutputTokens,
    maxRetries: PLAN_GENERATION_MAX_RETRIES,
  };

  // Use streaming to push progress chunks to the client in real-time
  let result;
  const streamChunkSize = 500; // Flush every ~500 chars

  async function streamAndCollect(
    model: Parameters<typeof streamText>[0]["model"],
  ): Promise<{ text: string; finishReason: string }> {
    const streamResult = streamText({
      model,
      ...generateParams,
      abortSignal: AbortSignal.timeout(halfTimeout),
    });
    let fullText = "";
    let lastFlushed = 0;
    try {
      for await (const chunk of streamResult.textStream) {
        fullText += chunk;
        if (fullText.length - lastFlushed > streamChunkSize) {
          await ctx.runMutation(internal.streamingManager.appendChunk, {
            streamId,
            text: fullText.substring(lastFlushed),
            final: false,
          });
          lastFlushed = fullText.length;
        }
      }
    } finally {
      // Always finalize the stream so clients don't hang
      if (fullText.length > lastFlushed) {
        await ctx.runMutation(internal.streamingManager.appendChunk, {
          streamId,
          text: fullText.substring(lastFlushed),
          final: true,
        });
      } else {
        await ctx.runMutation(internal.streamingManager.appendChunk, {
          streamId,
          text: "",
          final: true,
        });
      }
    }
    const finishReason = await streamResult.finishReason;
    return { text: fullText, finishReason };
  }

  try {
    result = await streamAndCollect(google(PLAN_MODEL_PRIMARY));
  } catch (primaryErr) {
    console.warn(
      `[AI] Primary model (Gemini) streaming failed for meal plan, falling back to DeepSeek: ${primaryErr}`,
    );
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekApiKey) throw new Error("DEEPSEEK_API_KEY environment variable is not set");
    const deepseek = createDeepSeek({ apiKey: deepseekApiKey });
    // Fallback uses batch generateText (simpler, more reliable)
    const batchResult = await generateText({
      model: deepseek(PLAN_MODEL_FALLBACK),
      ...generateParams,
      abortSignal: AbortSignal.timeout(halfTimeout),
    });
    result = { text: batchResult.text, finishReason: batchResult.finishReason };
    // Write fallback result to stream so client can see it
    await ctx.runMutation(internal.streamingManager.appendChunk, {
      streamId,
      text: batchResult.text,
      final: true,
    });
  }

  // --- Truncation detection + retry with reduced scope ---
  if (result.finishReason === "length") {
    console.warn(
      `[AI] Meal plan truncated for user ${userId} (finishReason=length, ${result.text.length} chars). Retrying with simplified prompt.`,
    );
    const retryPrompt = `Create a ${safeDuration}-day meal plan ${isArabic ? "ENTIRELY IN ARABIC" : "in English"}:

CLIENT PROFILE:
${contextBlock}

DAILY NUTRITION TARGETS: ${nutritionTargets.calories} kcal | ${nutritionTargets.protein}g protein | ${nutritionTargets.carbs}g carbs | ${nutritionTargets.fat}g fat

IMPORTANT: Keep output concise to avoid truncation.
- 4 meals per day (breakfast, lunch, snack, dinner)
- 3 ingredients per meal max
- 1 instruction step per meal
- NO alternatives
- Short ingredient descriptions

Return JSON: { "dailyTargets": {...}, "weeklyPlan": { "day1": { "dailyTotals": {...}, "meals": [{ "name", "type", "calories", "protein", "carbs", "fat", "ingredients": [...], "instructions": [...] }] }, ...up to "day${safeDuration}" }, "notes": "string" }
Respond ONLY with valid JSON.`;

    try {
      const retryResult = await generateText({
        model: google(PLAN_MODEL_PRIMARY),
        system: systemPrompt,
        prompt: retryPrompt,
        temperature: 0.3,
        maxOutputTokens: MEAL_OUTPUT_TOKENS_AR,
        maxRetries: 1,
        abortSignal: AbortSignal.timeout(halfTimeout),
      });
      result = { text: retryResult.text, finishReason: retryResult.finishReason };
    } catch {
      const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
      if (!deepseekApiKey) throw new Error("DEEPSEEK_API_KEY environment variable is not set");
      const deepseek = createDeepSeek({ apiKey: deepseekApiKey });
      const retryResult = await generateText({
        model: deepseek(PLAN_MODEL_FALLBACK),
        system: systemPrompt,
        prompt: retryPrompt,
        temperature: 0.3,
        maxOutputTokens: MEAL_OUTPUT_TOKENS_AR,
        maxRetries: 1,
        abortSignal: AbortSignal.timeout(halfTimeout),
      });
      result = { text: retryResult.text, finishReason: retryResult.finishReason };
    }
  }

  let planData: Record<string, unknown>;
  try {
    planData = extractJSON(result.text);
  } catch (parseErr) {
    console.error(
      `[AI] Meal plan JSON parse failed for user ${userId}. Text length: ${result.text.length}, finish reason: ${result.finishReason}. First 500 chars: ${result.text.slice(0, 500)}`,
    );
    if (result.finishReason === "length") {
      throw new Error(
        "Meal plan too long for AI model output limit. Try reducing plan duration or simplifying requirements.",
      );
    }
    throw new Error(
      `Meal plan generation failed: AI returned invalid JSON (finish reason: ${result.finishReason})`,
    );
  }

  // Post-generation validation & auto-correction
  const validationWarnings = validateAndCorrectMealPlan(planData, nutritionTargets);
  if (validationWarnings.length > 0) {
    planData.validationWarnings = validationWarnings;
    console.warn(
      `[AI] Meal plan validation: ${validationWarnings.length} warnings for user ${userId}`,
      validationWarnings,
    );
  }

  const durationMs = Date.now() - startTime;
  console.log(`[AI] Meal plan generated in ${durationMs}ms for user ${userId}`);

  const startDate = new Date().toISOString().split("T")[0]!;
  const endDate = new Date(Date.now() + safeDuration * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]!;

  return ctx.runMutation(internal.mealPlans.savePlanInternal, {
    userId,
    checkInId,
    planData,
    aiGeneratedContent: result.text,
    streamId,
    language,
    startDate,
    endDate,
    assessmentVersion: clientCtx.assessmentVersion,
  });
}

async function generateWorkoutPlanHandler(
  ctx: ActionCtx,
  {
    userId,
    checkInId,
    language,
    planDuration,
  }: {
    userId: string;
    checkInId?: Id<"checkIns">;
    language: "en" | "ar";
    planDuration: number;
  },
): Promise<Id<"workoutPlans">> {
  const safeDuration = Math.max(planDuration, 1);
  const startTime = Date.now();

  // Fetch client context + exercise database in parallel
  const [clientCtx, exercises] = await Promise.all([
    fetchClientContextWithRetry(ctx, userId, checkInId),
    ctx.runQuery(internal.exerciseDatabase.getActiveExercises, {}),
  ]);

  const assessment = clientCtx.assessment!;
  const scheduleData = assessment.scheduleAvailability as { days?: string[] } | null;
  const trainingDays = Math.max(1, scheduleData?.days?.length ?? 4);

  // Deterministic split selection (same logic as before)
  const split = selectWorkoutSplit(
    assessment.experienceLevel as "beginner" | "intermediate" | "advanced" | undefined,
    trainingDays,
    safeDuration,
  );

  // Get previous plan for progressive overload
  const previousPlan = await ctx.runQuery(internal.workoutPlans.getCurrentPlanInternal, { userId });

  // Parse injuries from assessment + latest check-in
  const latestCheckIn = clientCtx.checkInHistory?.[0] ?? null;
  const injuries = parseInjuries(assessment, latestCheckIn);

  // Compute adherence/energy/sleep from check-in history (nullish-safe: 0 is a valid value)
  const recentCheckIns = clientCtx.checkInHistory ?? [];
  function avgField(field: string): number | null {
    if (recentCheckIns.length === 0) return null;
    const values = recentCheckIns
      .map((c: Record<string, unknown>) => {
        const v = c[field];
        return v != null ? Number(v) : null;
      })
      .filter((v): v is number => v != null && !isNaN(v));
    if (values.length === 0) return null;
    return values.reduce((s, v) => s + v, 0) / values.length;
  }
  const avgAdherence = avgField("dietaryAdherence");
  const avgEnergy = avgField("energyLevel");
  const avgSleep = avgField("sleepQuality");

  // Generate deterministic plan from exercise database
  const planData = buildWorkoutPlan(exercises as any[], {
    split,
    planDuration: safeDuration,
    experienceLevel:
      (assessment.experienceLevel as "beginner" | "intermediate" | "advanced") ?? "intermediate",
    goal: assessment.goals ?? "hypertrophy",
    trainingDaysPerWeek: trainingDays,
    injuries,
    adherenceLevel: avgAdherence,
    energyLevel: avgEnergy,
    sleepQuality: avgSleep,
    previousPlan: previousPlan?.planData ?? null,
    language,
    availableEquipment: (() => {
      const eq = (assessment.lifestyleHabits as any)?.equipment;
      if (!eq) return undefined;
      return Array.isArray(eq) ? eq : [eq];
    })(),
    gender: assessment.gender === "female" ? "female" : "male",
  });

  // Create stream and mark it done immediately (backward compat)
  const streamId: string = await ctx.runMutation(internal.streamingManager.createStream, {});
  // Mark stream as complete right away since generation is instant
  await ctx.runMutation(internal.streamingManager.appendChunk, {
    streamId,
    text: JSON.stringify(planData),
    final: true,
  });

  const durationMs = Date.now() - startTime;
  console.log(
    `[Engine] Workout plan generated in ${durationMs}ms for user ${userId} (deterministic, ${exercises.length} exercises in DB)`,
  );

  const startDate = new Date().toISOString().split("T")[0]!;
  const endDate = new Date(Date.now() + safeDuration * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]!;

  return ctx.runMutation(internal.workoutPlans.savePlanInternal, {
    userId,
    checkInId,
    planData,
    streamId,
    language,
    startDate,
    endDate,
    assessmentVersion: clientCtx.assessmentVersion,
  });
}

// ---------------------------------------------------------------------------
// Internal actions — called by the durable workflow
// ---------------------------------------------------------------------------

export const generateMealPlanInternal = internalAction({
  args: {
    userId: v.string(),
    checkInId: v.optional(v.id("checkIns")),
    language: v.union(v.literal("en"), v.literal("ar")),
    planDuration: v.optional(v.number()),
  },
  returns: v.id("mealPlans"),
  handler: async (ctx, { userId, checkInId, language, planDuration }): Promise<Id<"mealPlans">> => {
    const resolvedDuration: number =
      planDuration ?? (await ctx.runQuery(internal.helpers.getMealPlanDurationInternal));
    return generateMealPlanHandler(ctx, {
      userId,
      checkInId,
      language,
      planDuration: resolvedDuration,
    });
  },
});

export const generateWorkoutPlanInternal = internalAction({
  args: {
    userId: v.string(),
    checkInId: v.optional(v.id("checkIns")),
    language: v.union(v.literal("en"), v.literal("ar")),
    planDuration: v.optional(v.number()),
  },
  returns: v.id("workoutPlans"),
  handler: async (
    ctx,
    { userId, checkInId, language, planDuration },
  ): Promise<Id<"workoutPlans">> => {
    const resolvedDuration: number =
      planDuration ?? (await ctx.runQuery(internal.helpers.getWorkoutPlanDurationInternal));
    return generateWorkoutPlanHandler(ctx, {
      userId,
      checkInId,
      language,
      planDuration: resolvedDuration,
    });
  },
});

// ---------------------------------------------------------------------------
// Dynamic plan-generation rate limiting
// ---------------------------------------------------------------------------

async function checkPlanGenerationLimit(
  ctx: ActionCtx,
  userId: string,
  isInitialGeneration?: boolean,
): Promise<void> {
  if (isInitialGeneration) {
    // Server-side verification: user must have zero existing plans
    const existingCount: number = await ctx.runQuery(internal.helpers.countRecentPlans, {
      userId,
      since: 0,
    });
    if (existingCount >= 2) throw new Error("Initial generation already completed");
    return;
  }

  const frequencyDays: number = await ctx.runQuery(internal.helpers.getCheckInFrequencyInternal);
  const windowStart = Date.now() - frequencyDays * 24 * 60 * 60 * 1000;
  const recentCount: number = await ctx.runQuery(internal.helpers.countRecentPlans, {
    userId,
    since: windowStart,
  });
  if (recentCount >= 2) {
    throw new Error("Plan generation limit reached for this cycle");
  }
}

// ---------------------------------------------------------------------------
// Public actions — dynamically rate-limited; for direct client calls
// ---------------------------------------------------------------------------

export const generateMealPlan = action({
  args: {
    checkInId: v.optional(v.id("checkIns")),
    language: v.union(v.literal("en"), v.literal("ar")),
    planDuration: v.optional(v.number()),
    isInitialGeneration: v.optional(v.boolean()),
  },
  returns: v.id("mealPlans"),
  handler: async (
    ctx,
    { checkInId, language, planDuration, isInitialGeneration },
  ): Promise<Id<"mealPlans">> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await checkPlanGenerationLimit(ctx, userId, isInitialGeneration);

    const resolvedDuration =
      planDuration ?? (await ctx.runQuery(internal.helpers.getMealPlanDurationInternal));
    return generateMealPlanHandler(ctx, {
      userId,
      checkInId,
      language,
      planDuration: resolvedDuration,
    });
  },
});

export const generateWorkoutPlan = action({
  args: {
    checkInId: v.optional(v.id("checkIns")),
    language: v.union(v.literal("en"), v.literal("ar")),
    planDuration: v.optional(v.number()),
    isInitialGeneration: v.optional(v.boolean()),
  },
  returns: v.id("workoutPlans"),
  handler: async (
    ctx,
    { checkInId, language, planDuration, isInitialGeneration },
  ): Promise<Id<"workoutPlans">> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await checkPlanGenerationLimit(ctx, userId, isInitialGeneration);

    const resolvedDuration =
      planDuration ?? (await ctx.runQuery(internal.helpers.getWorkoutPlanDurationInternal));
    return generateWorkoutPlanHandler(ctx, {
      userId,
      checkInId,
      language,
      planDuration: resolvedDuration,
    });
  },
});

// ---------------------------------------------------------------------------
// Plan content translation (lazy, on-demand when locale mismatches plan language)
// ---------------------------------------------------------------------------

const LANGUAGE_NAMES: Record<string, string> = { en: "English", ar: "Arabic" };

export const translatePlanContent = internalAction({
  args: {
    planId: v.string(),
    planType: v.union(v.literal("meal"), v.literal("workout")),
    planData: v.any(),
    sourceLanguage: v.union(v.literal("en"), v.literal("ar")),
    targetLanguage: v.union(v.literal("en"), v.literal("ar")),
  },
  handler: async (ctx, args) => {
    const { google } = await import("@ai-sdk/google");
    const { createDeepSeek } = await import("@ai-sdk/deepseek");
    const { generateText } = await import("ai");

    const sourceName = LANGUAGE_NAMES[args.sourceLanguage];
    const targetName = LANGUAGE_NAMES[args.targetLanguage];

    const maxTokens =
      args.planType === "meal"
        ? args.targetLanguage === "ar"
          ? MEAL_OUTPUT_TOKENS_AR
          : MEAL_OUTPUT_TOKENS_EN
        : args.targetLanguage === "ar"
          ? WORKOUT_OUTPUT_TOKENS_AR
          : WORKOUT_OUTPUT_TOKENS_EN;

    const halfTimeout = PLAN_GENERATION_TIMEOUT_MS / 2;
    const translateParams = {
      maxOutputTokens: maxTokens,
      temperature: 0.3,
      messages: [
        {
          role: "system" as const,
          content:
            `You are a professional fitness content translator. Translate all human-readable text values in the JSON below from ${sourceName} to ${targetName}. ` +
            `Keep ALL JSON keys, numbers, booleans, and structure EXACTLY the same. ` +
            `Only translate values that are: meal/exercise names, ingredients, instructions, notes, alternatives, workout names, muscle names, safety tips, progression notes. ` +
            `Do NOT translate JSON keys like "name", "type", "calories", "day1", etc. Do NOT change any numeric values. ` +
            `Return ONLY valid JSON with the exact same structure.`,
        },
        { role: "user" as const, content: JSON.stringify(args.planData) },
      ],
    };

    let raw: string;
    try {
      const res = await generateText({
        model: google(PLAN_MODEL_PRIMARY),
        ...translateParams,
        abortSignal: AbortSignal.timeout(halfTimeout),
      });
      raw = res.text;
    } catch (primaryErr) {
      console.warn(
        `[AI] Primary model (Gemini) failed for translation, falling back to DeepSeek: ${primaryErr}`,
      );
      const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
      if (!deepseekApiKey) throw new Error("DEEPSEEK_API_KEY environment variable is not set");
      const deepseek = createDeepSeek({ apiKey: deepseekApiKey });
      const res = await generateText({
        model: deepseek(PLAN_MODEL_FALLBACK),
        ...translateParams,
        abortSignal: AbortSignal.timeout(halfTimeout),
      });
      raw = res.text;
    }

    const translatedData = extractJSON(raw);

    const saveMutation =
      args.planType === "meal"
        ? internal.mealPlans.saveTranslation
        : internal.workoutPlans.saveTranslation;

    await ctx.runMutation(saveMutation, {
      planId: args.planId as any,
      translatedPlanData: translatedData,
      translatedLanguage: args.targetLanguage,
    });
  },
});

// ---------------------------------------------------------------------------
// Contextual translation EN → AR (used by admin plan name field)
// ---------------------------------------------------------------------------

export const translateToArabic = action({
  args: { text: v.string() },
  returns: v.string(),
  handler: async (ctx, { text }): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (!text.trim()) return "";

    // Truncate input to prevent abuse (translation is for short UI strings)
    const truncatedText = text.slice(0, 500);

    const { google } = await import("@ai-sdk/google");
    const { createDeepSeek } = await import("@ai-sdk/deepseek");
    const { generateText } = await import("ai");

    const translateMessages = [
      {
        role: "system" as const,
        content:
          "You are a professional Arabic translator for a fitness coaching app. " +
          "Translate the given English text into natural, modern Arabic as it would be used in fitness/gym marketing in Egypt. " +
          "Do NOT do literal word-for-word translation. Use the Arabic word or phrase that conveys the same meaning and feeling. " +
          "For example: 'Starter' → 'مبتدئ', 'Premium' → 'مميز', 'Pro' → 'احترافي', 'Ultimate' → 'شامل'. " +
          "Return ONLY the Arabic translation, nothing else.",
      },
      { role: "user" as const, content: truncatedText },
    ];

    try {
      let translated: string;
      try {
        const res = await generateText({
          model: google(PLAN_MODEL_PRIMARY),
          maxOutputTokens: 100,
          temperature: 0.3,
          messages: translateMessages,
          abortSignal: AbortSignal.timeout(30_000),
        });
        translated = res.text;
      } catch (primaryErr) {
        console.warn(
          `[AI] Primary model (Gemini) failed for Arabic translation, falling back to DeepSeek: ${primaryErr}`,
        );
        const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
        if (!deepseekApiKey) throw new Error("DEEPSEEK_API_KEY environment variable is not set");
        const deepseek = createDeepSeek({ apiKey: deepseekApiKey });
        const res = await generateText({
          model: deepseek(PLAN_MODEL_FALLBACK),
          maxOutputTokens: 100,
          temperature: 0.3,
          messages: translateMessages,
          abortSignal: AbortSignal.timeout(30_000),
        });
        translated = res.text;
      }

      return translated.trim();
    } catch (err) {
      console.error("[AI] Translation failed:", err);
      throw new Error("Translation failed. Please try again.");
    }
  },
});
