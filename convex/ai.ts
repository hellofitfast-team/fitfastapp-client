"use node";

import { v } from "convex/values";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "./auth";
import { type ClientContext, formatContextForPrompt } from "./clientContext";
import { calculateNutritionTargets, type NutritionTargets } from "./nutritionEngine";
import { selectWorkoutSplit, type WorkoutSplit } from "./workoutSplitEngine";

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
    | "totals_corrected";
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
      // Scale portions proportionally to hit target
      const scaleFactor = nutritionTargets.calories / sumCalories;
      for (const meal of dayData.meals) {
        if (!meal || typeof meal !== "object") continue;
        meal.calories = Math.round((Number(meal.calories) || 0) * scaleFactor);
        meal.protein = Math.round((Number(meal.protein) || 0) * scaleFactor);
        meal.carbs = Math.round((Number(meal.carbs) || 0) * scaleFactor);
        meal.fat = Math.round((Number(meal.fat) || 0) * scaleFactor);
      }
      dayData.dailyTotals = {
        calories: nutritionTargets.calories,
        protein: Math.round(sumProtein * scaleFactor),
        carbs: Math.round(sumCarbs * scaleFactor),
        fat: Math.round(sumFat * scaleFactor),
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

  try {
    const chunks: string[] = await ctx.runAction(internal.knowledgeBaseActions.searchKnowledge, {
      query: clientContext,
      limit: 5,
      tags,
    });

    if (chunks.length === 0) return "";

    return `\nCOACH'S TRAINING PHILOSOPHY & GUIDELINES:\n${chunks.join("\n\n")}`;
  } catch {
    // Knowledge base may be empty or not initialized yet
    return "";
  }
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
  // Build rich progressive context (profile, assessment, check-in history, adherence, reflections)
  const clientCtx: ClientContext = await ctx.runQuery(internal.clientContext.buildClientContext, {
    userId,
    checkInId,
  });

  if (!clientCtx.assessment) throw new Error("Assessment not found");

  // Pre-calculate nutrition targets deterministically
  const assessment = clientCtx.assessment;
  const scheduleData = assessment.scheduleAvailability as { days?: string[] } | null;
  const trainingDays = scheduleData?.days?.length ?? 4;
  console.log(
    `[AI] Generating meal plan for user ${userId} (${language}), training days: ${trainingDays}`,
  );

  const nutritionTargets: NutritionTargets = calculateNutritionTargets({
    weightKg: assessment.currentWeight ?? 75,
    heightCm: assessment.height ?? 170,
    age: assessment.age ?? 30,
    gender: assessment.gender === "female" ? "female" : "male",
    trainingDaysPerWeek: trainingDays,
    goal: assessment.goals?.split(",")[0]?.trim() ?? "general_fitness",
    activityLevel: (assessment as any).activityLevel ?? undefined,
  });

  // Fetch coach knowledge context via RAG (filtered to nutrition/general docs)
  const knowledgeSection = await getCoachKnowledgeContext(ctx, clientCtx.assessment, "meal");

  // Fetch food database reference for the AI prompt
  const foodReference: string = await ctx.runQuery(
    internal.foodDatabase.getFoodReferenceForPrompt,
    {},
  );

  const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
  const { generateText } = await import("ai");
  const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
  const isArabic = language === "ar";

  const contextBlock = formatContextForPrompt(clientCtx);

  const systemPrompt = `You are an expert sports nutritionist and meal planning AI specializing in ${isArabic ? "Middle Eastern and Egyptian cuisine" : "international cuisine"}. Create personalized meal plans grounded in evidence-based nutrition science.
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

EVIDENCE-BASED NUTRITION SCIENCE (apply these principles):
Protein Timing & Distribution:
- Distribute protein evenly across meals (0.3-0.5g/kg per meal) for optimal muscle protein synthesis (MPS)
- Include 20-40g protein per meal; leucine threshold is ~2.5g per sitting
- Post-workout meal should be protein-rich within 2 hours of training

Fat Quality:
- Prioritize unsaturated fats: olive oil, avocado, nuts, fatty fish
- Omega-3 sources: salmon, sardines, walnuts, flaxseed (aim 1-2g EPA+DHA daily for anti-inflammatory benefits)
- Keep saturated fat below 10% of total calories

Carbohydrate Strategy:
- Complex carbs for sustained energy: oats, brown rice, sweet potato, whole wheat
- Simple carbs acceptable post-workout (fruit, white rice) for glycogen replenishment
- Fiber target: 25-35g/day from vegetables, legumes, whole grains
- For fat loss: place more carbs around workout times (carb cycling lite)

Micronutrient Awareness:
- Iron: include red meat, lentils, spinach (especially important for females)
- Calcium: dairy, fortified alternatives, leafy greens
- Vitamin D: eggs, fatty fish, fortified foods (common deficiency in MENA region)
- Magnesium: nuts, seeds, dark chocolate, leafy greens (supports sleep and recovery)
- Hydration: recommend 35ml/kg body weight daily + 500ml per workout hour

Meal Complexity by Adherence:
- High adherence (>80%): detailed recipes with multiple ingredients
- Medium adherence (50-80%): moderate complexity, familiar foods
- Low adherence (<50%): extremely simple meals, minimal prep, grab-and-go options

Egyptian/MENA Staple Foods (prefer these when culturally appropriate):
- Proteins: eggs, chicken breast, beef, lentils, fava beans (foul), white cheese, labneh, Greek yogurt
- Carbs: baladi bread, rice, sweet potato, oats, freekeh, couscous
- Fats: olive oil, tahini, nuts, avocado
- Vegetables: tomatoes, cucumber, molokhia, bamia, eggplant, peppers

GUIDELINES:
1. Consider food preferences, allergies, and dietary restrictions
2. Each meal must have accurate macros that sum to the daily totals above
3. Use locally available, affordable ingredients
4. Include specific measurements (grams, cups, tablespoons) and detailed cooking instructions with cooking times, temperatures, and practical tips (e.g. "Cook on medium heat for 3-4 minutes per side until golden", "Bake at 180°C/350°F for 20 minutes", "Soak overnight in the fridge")
5. Each meal must have 1-2 fully detailed alternatives with name, type, calories, protein, carbs, fat, ingredients, and instructions. Alternatives should match the main meal's calories within ±10%.
6. If adherence data is provided, adjust meal complexity accordingly
7. If weight trend shows stall (>2 weeks same weight on fat loss), slightly increase protein and reduce carbs
8. Vary meals across days — avoid repeating the same meal more than twice per week
${isArabic ? "ALL content MUST be in Arabic language. Focus on Egyptian/Middle Eastern cuisine." : ""}${knowledgeSection}
${foodReference}
IMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, just raw JSON.`;

  const userPrompt = `Create a ${planDuration}-day meal plan ${isArabic ? "ENTIRELY IN ARABIC" : "in English"}:

CLIENT PROFILE:
${contextBlock}

DAILY NUTRITION TARGETS: ${nutritionTargets.calories} kcal | ${nutritionTargets.protein}g protein | ${nutritionTargets.carbs}g carbs | ${nutritionTargets.fat}g fat

Return a JSON object with this EXACT structure (include ALL fields for every meal):
{
  "dailyTargets": { "calories": ${nutritionTargets.calories}, "protein": ${nutritionTargets.protein}, "carbs": ${nutritionTargets.carbs}, "fat": ${nutritionTargets.fat} },
  "weeklyPlan": {
    "day1": {
      "dailyTotals": { "calories": ${nutritionTargets.calories}, "protein": ${nutritionTargets.protein}, "carbs": ${nutritionTargets.carbs}, "fat": ${nutritionTargets.fat} },
      "meals": [
        {
          "name": "Breakfast - Scrambled Eggs",
          "type": "breakfast",
          "calories": 450,
          "protein": 30,
          "carbs": 35,
          "fat": 20,
          "ingredients": ["3 eggs", "2 slices whole wheat toast", "1 tbsp olive oil", "salt and pepper to taste"],
          "instructions": ["Heat olive oil in a non-stick pan over medium-low heat for 30 seconds", "Crack eggs into a bowl, season with salt and pepper, and whisk for 15 seconds", "Pour eggs into pan and stir gently with a spatula for 2-3 minutes until just set but still soft", "Toast bread until golden (~2 minutes) and serve alongside eggs"],
          "alternatives": [
            {
              "name": "Oatmeal with Protein Powder",
              "type": "breakfast",
              "calories": 450,
              "protein": 30,
              "carbs": 55,
              "fat": 8,
              "ingredients": ["50g rolled oats", "1 scoop whey protein", "200ml milk", "1 tbsp honey"],
              "instructions": ["Combine oats and milk in a pot, bring to a simmer over medium heat, stirring occasionally for 4-5 minutes until thick and creamy", "Remove from heat and let cool for 1-2 minutes (hot liquid denatures whey protein)", "Stir in protein powder until fully dissolved", "Drizzle honey on top and serve warm"]
            }
          ]
        }
      ]
    },
    "day2": { ... },
    ...up to "day${planDuration}"
  },
  "notes": "string"
}
Each meal MUST have: name, type, calories, protein, carbs, fat, ingredients, instructions, alternatives.
Each alternative MUST be a full meal object with: name, type, calories, protein, carbs, fat, ingredients, instructions.

VALIDATION RULES (the plan will be programmatically verified — violations will be rejected):
- Daily meal calories MUST sum to exactly ${nutritionTargets.calories} kcal (±20 cal tolerance)
- Daily protein MUST sum to exactly ${nutritionTargets.protein}g (±5g tolerance)
- Daily carbs MUST sum to exactly ${nutritionTargets.carbs}g (±5g tolerance)
- Daily fat MUST sum to exactly ${nutritionTargets.fat}g (±5g tolerance)
- For each meal: Protein(g)×4 + Carbs(g)×4 + Fat(g)×9 must equal that meal's calories (±30 cal tolerance)
- Do NOT round the daily target to a "nice" number — use the EXACT values provided above`;

  // Create stream for live progress
  const streamId: string = await ctx.runMutation(internal.streamingManager.createStream, {});

  const result = await generateText({
    model: openrouter("deepseek/deepseek-chat"),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.4,
    maxOutputTokens: 16000,
    maxRetries: 3,
  });

  let planData: Record<string, unknown>;
  try {
    const cleaned = result.text.replace(/```json\n?|```\n?/g, "").trim();
    planData = JSON.parse(cleaned);
  } catch (parseErr) {
    console.error(
      `[AI] Meal plan JSON parse failed for user ${userId}. Text length: ${result.text.length}, finish reason: ${result.finishReason}`,
    );
    planData = { raw: result.text, parseError: true };
  }

  // Post-generation validation & auto-correction
  if (!planData.parseError) {
    const validationWarnings = validateAndCorrectMealPlan(planData, nutritionTargets);
    if (validationWarnings.length > 0) {
      planData.validationWarnings = validationWarnings;
      console.warn(
        `[AI] Meal plan validation: ${validationWarnings.length} warnings for user ${userId}`,
        validationWarnings,
      );
    }
  }

  const startDate = new Date().toISOString().split("T")[0]!;
  const endDate = new Date(Date.now() + planDuration * 24 * 60 * 60 * 1000)
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
  // Build rich progressive context (profile, assessment, check-in history, adherence, reflections)
  const clientCtx: ClientContext = await ctx.runQuery(internal.clientContext.buildClientContext, {
    userId,
    checkInId,
  });

  if (!clientCtx.assessment) throw new Error("Assessment not found");

  // Pre-select workout split deterministically
  const assessment = clientCtx.assessment;
  const scheduleData = assessment.scheduleAvailability as { days?: string[] } | null;
  const trainingDays = scheduleData?.days?.length ?? 4;
  const split: WorkoutSplit = selectWorkoutSplit(
    assessment.experienceLevel as "beginner" | "intermediate" | "advanced" | undefined,
    trainingDays,
    planDuration,
  );

  // Fetch coach knowledge context via RAG (filtered to workout/recovery/general docs)
  const knowledgeSection = await getCoachKnowledgeContext(ctx, clientCtx.assessment, "workout");

  const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
  const { generateText } = await import("ai");
  const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
  const isArabic = language === "ar";

  const contextBlock = formatContextForPrompt(clientCtx);
  const dayLabelsStr = (isArabic ? split.dayLabelsAr : split.dayLabels)
    .slice(0, planDuration)
    .join(" → ");

  const systemPrompt = `You are an expert certified personal trainer and exercise physiologist. Create personalized workout plans grounded in evidence-based exercise science.

TRAINING STRUCTURE (pre-selected based on client data — follow this split exactly):
- Split: ${isArabic ? split.splitNameAr : split.splitName}
- Training days per week: ${trainingDays}
- Day-by-day labels for the plan: ${dayLabelsStr}
- Follow the day labels above: if a day says "Rest", make it a rest day. If it says "Push", program push exercises (chest, shoulders, triceps), etc.

EXERCISE SCIENCE REFERENCE (apply these principles):

Progressive Overload:
- Each plan cycle should progress from the previous: more weight, more reps, or more sets
- Beginners: add reps first (8→10→12), then increase weight and reset to 8
- Intermediate/Advanced: use periodization — alternate heavy (3-6 reps) and moderate (8-12 reps) weeks

Volume Landmarks (sets per muscle group per week):
- Minimum Effective Volume (MEV): 8-10 sets/muscle/week
- Maximum Recoverable Volume (MRV): 15-20 sets/muscle/week for most people
- Beginners: start at MEV (8-10 sets). Advanced: approach MRV (15-20 sets)
- Distribute volume across 2+ sessions per muscle when possible

Rep Ranges by Goal:
- Strength: 3-6 reps, 80-90% 1RM, 3-5 sets, 2-3 min rest
- Hypertrophy: 8-12 reps, 65-80% 1RM, 3-4 sets, 60-90s rest
- Endurance/Conditioning: 15-20 reps, 50-65% 1RM, 2-3 sets, 30-60s rest
- Fat loss programs: use hypertrophy ranges with shorter rest (45-60s) for metabolic effect

Exercise Selection Hierarchy:
1. Compound movements FIRST (squat, deadlift, bench press, row, overhead press, pull-up)
2. Then accessory compounds (lunges, incline press, lat pulldown, cable row)
3. Then isolation exercises (curls, lateral raises, tricep extensions, leg curls)
- Beginners: 80% compound, 20% isolation
- Advanced: 60% compound, 40% isolation

Muscle Group Pairings for Split Types:
- Push day: chest (bench, incline press, flyes), shoulders (overhead press, lateral raises), triceps (pushdowns, overhead extensions)
- Pull day: back (rows, pulldowns, face pulls), biceps (curls, hammer curls), rear delts
- Legs day: quads (squats, leg press, lunges), hamstrings (RDL, leg curl), glutes (hip thrust), calves
- Upper day: chest + back + shoulders + arms
- Lower day: quads + hamstrings + glutes + calves + core
- Full body: 1 push + 1 pull + 1 leg + 1 core per session

Warm-Up Protocol (5-10 minutes):
- 2-3 min general cardio (jumping jacks, light jog, jump rope)
- Dynamic stretches targeting session's muscle groups
- 1-2 warm-up sets of the first exercise at 50% and 75% working weight

Cool-Down Protocol (5 minutes):
- Static stretches for worked muscles (hold 20-30 seconds each)
- Deep breathing / relaxation

Rest Day Programming:
- Light activity encouraged: walking, yoga, swimming
- Active recovery helps reduce DOMS and improve circulation

Safety & Injury Prevention:
- Always cue proper form in instructions (e.g., "keep back straight", "knees track over toes")
- If client has knee issues: avoid deep squats, prefer leg press and partial ROM
- If client has shoulder issues: avoid behind-neck press, prefer neutral grip pressing
- If client has back issues: avoid heavy deadlifts, prefer hip hinge machines and core stability work
- New injuries reported: remove aggravating exercises, substitute with pain-free alternatives

Adaptation by Adherence:
- High adherence (>80%): full program with progressive overload
- Medium adherence (50-80%): reduce to 3-4 exercises per session, focus on compounds
- Low adherence (<50%): minimalist program — 2-3 compound exercises only, 20-30 min sessions

GUIDELINES:
1. Consider experience level and fitness goals
2. Account for injuries or medical conditions
3. Respect schedule availability and session duration preferences
4. Include warm-up and cool-down for every training day
5. Provide clear, safe instructions for each exercise including form cues
6. If workout adherence data is provided, adjust volume accordingly
7. If energy/sleep averages are low (<5/10), reduce volume by 20% and intensity
8. Each exercise instruction should include: starting position, movement, breathing pattern
${isArabic ? "ALL content MUST be in Arabic language." : ""}${knowledgeSection}
IMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, just raw JSON.`;

  const userPrompt = `Create a ${planDuration}-day workout plan ${isArabic ? "ENTIRELY IN ARABIC" : "in English"}:

CLIENT PROFILE:
${contextBlock}

TRAINING SPLIT: ${isArabic ? split.splitNameAr : split.splitName}
DAY LABELS: ${dayLabelsStr}

Return a JSON object with this EXACT structure (include ALL fields for every exercise):
{
  "splitType": "${split.splitType}",
  "splitName": "${isArabic ? split.splitNameAr : split.splitName}",
  "splitDescription": "${isArabic ? split.splitDescriptionAr : split.splitDescription}",
  "weeklyPlan": {
    "day1": {
      "workoutName": "Upper Body Strength",
      "duration": 45,
      "targetMuscles": ["chest", "shoulders"],
      "restDay": false,
      "warmup": { "exercises": [{ "name": "Arm circles", "duration": 30, "instructions": ["..."] }] },
      "exercises": [{ "name": "Bench Press", "sets": 3, "reps": "10", "restBetweenSets": "60s", "targetMuscles": ["chest"], "instructions": ["..."] }],
      "cooldown": { "exercises": [{ "name": "Chest stretch", "duration": 30, "instructions": ["..."] }] }
    },
    "day2": { "restDay": true, "workoutName": "Rest Day" },
    ...up to "day${planDuration}"
  },
  "progressionNotes": "string",
  "safetyTips": ["string"]
}
Each workout day MUST have: workoutName, duration, targetMuscles, restDay, warmup, exercises, cooldown.
Each exercise MUST have: name, sets, reps, restBetweenSets, targetMuscles, instructions.
Rest days only need: restDay=true, workoutName.`;

  // Create stream for live progress
  const streamId: string = await ctx.runMutation(internal.streamingManager.createStream, {});

  const result = await generateText({
    model: openrouter("deepseek/deepseek-chat"),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.4,
    maxOutputTokens: 6000,
    maxRetries: 3,
  });

  let planData: Record<string, unknown>;
  try {
    const cleaned = result.text.replace(/```json\n?|```\n?/g, "").trim();
    planData = JSON.parse(cleaned);
  } catch {
    planData = { raw: result.text, parseError: true };
  }

  // Post-generation validation
  if (!planData.parseError) {
    const validationWarnings = validateWorkoutPlan(planData);
    if (validationWarnings.length > 0) {
      planData.validationWarnings = validationWarnings;
      console.warn(
        `[AI] Workout plan validation: ${validationWarnings.length} warnings for user ${userId}`,
        validationWarnings,
      );
    }
  }

  const startDate = new Date().toISOString().split("T")[0]!;
  const endDate = new Date(Date.now() + planDuration * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]!;

  return ctx.runMutation(internal.workoutPlans.savePlanInternal, {
    userId,
    checkInId,
    planData,
    aiGeneratedContent: result.text,
    streamId,
    language,
    startDate,
    endDate,
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
      planDuration ?? (await ctx.runQuery(internal.helpers.getCheckInFrequencyInternal));
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
      planDuration ?? (await ctx.runQuery(internal.helpers.getCheckInFrequencyInternal));
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
      planDuration ?? (await ctx.runQuery(internal.helpers.getCheckInFrequencyInternal));
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
      planDuration ?? (await ctx.runQuery(internal.helpers.getCheckInFrequencyInternal));
    return generateWorkoutPlanHandler(ctx, {
      userId,
      checkInId,
      language,
      planDuration: resolvedDuration,
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

    const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
    const { generateText } = await import("ai");

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const { text: translated } = await generateText({
      model: openrouter("deepseek/deepseek-chat"),
      maxOutputTokens: 100,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a professional Arabic translator for a fitness coaching app. " +
            "Translate the given English text into natural, modern Arabic as it would be used in fitness/gym marketing in Egypt. " +
            "Do NOT do literal word-for-word translation. Use the Arabic word or phrase that conveys the same meaning and feeling. " +
            "For example: 'Starter' → 'مبتدئ', 'Premium' → 'مميز', 'Pro' → 'احترافي', 'Ultimate' → 'شامل'. " +
            "Return ONLY the Arabic translation, nothing else.",
        },
        { role: "user", content: text },
      ],
    });

    return translated.trim();
  },
});
