"use node";

import { v } from "convex/values";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "./auth";

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
): Promise<string> {
  const contextParts = [
    assessment.goals,
    assessment.dietaryRestrictions?.join(", "),
    assessment.foodPreferences?.join(", "),
    assessment.experienceLevel,
  ].filter(Boolean);

  if (contextParts.length === 0) return "";

  const clientContext = contextParts.join("; ");

  try {
    const chunks: string[] = await ctx.runAction(
      internal.knowledgeBaseActions.searchKnowledge,
      { query: clientContext, limit: 5 },
    );

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
  const profile = await ctx.runQuery(internal.helpers.getProfileInternal, { userId });
  const assessment = await ctx.runQuery(internal.helpers.getAssessmentInternal, { userId });
  const checkIn = checkInId
    ? await ctx.runQuery(internal.helpers.getCheckInInternal, { checkInId })
    : null;

  if (!profile || !assessment) throw new Error("Profile or assessment not found");

  // Fetch coach knowledge context via RAG
  const knowledgeSection = await getCoachKnowledgeContext(ctx, assessment);

  const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
  const { generateText } = await import("ai");
  const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
  const isArabic = language === "ar";

  const systemPrompt = `You are an expert nutritionist and meal planning AI specializing in ${isArabic ? "Middle Eastern and Egyptian cuisine" : "international cuisine"}. Create personalized meal plans.
GUIDELINES:
1. Consider food preferences, allergies, and dietary restrictions
2. Balance macronutrients for the user's goals
3. Use locally available ingredients
4. Include specific measurements and clear instructions
5. Suggest alternatives for flexibility
${isArabic ? "ALL content MUST be in Arabic language. Focus on Egyptian/Middle Eastern cuisine." : ""}${knowledgeSection}
IMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, just raw JSON.`;

  const userPrompt = `Create a ${planDuration}-day meal plan ${isArabic ? "ENTIRELY IN ARABIC" : "in English"}:
GOALS: ${assessment.goals}
WEIGHT: ${assessment.currentWeight}kg, HEIGHT: ${assessment.height}cm
EXPERIENCE: ${assessment.experienceLevel}
PREFERENCES: ${assessment.foodPreferences?.join(", ") || "None"}
ALLERGIES: ${assessment.allergies?.join(", ") || "None"}
RESTRICTIONS: ${assessment.dietaryRestrictions?.join(", ") || "None"}
${checkIn ? `CHECK-IN: Weight ${checkIn.weight}kg, Energy ${checkIn.energyLevel}/10, Sleep ${checkIn.sleepQuality}/10` : ""}

Return a JSON object with this structure:
{
  "weeklyPlan": { "day1": { "meals": [...] }, ... },
  "notes": "string"
}`;

  // Create stream for live progress
  const streamId: string = await ctx.runMutation(
    internal.streamingManager.createStream,
    {},
  );

  const result = await generateText({
    model: openrouter("deepseek/deepseek-chat"),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.7,
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
  const profile = await ctx.runQuery(internal.helpers.getProfileInternal, { userId });
  const assessment = await ctx.runQuery(internal.helpers.getAssessmentInternal, { userId });
  const checkIn = checkInId
    ? await ctx.runQuery(internal.helpers.getCheckInInternal, { checkInId })
    : null;

  if (!profile || !assessment) throw new Error("Profile or assessment not found");

  // Fetch coach knowledge context via RAG
  const knowledgeSection = await getCoachKnowledgeContext(ctx, assessment);

  const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
  const { generateText } = await import("ai");
  const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
  const isArabic = language === "ar";

  const systemPrompt = `You are an expert personal trainer. Create personalized workout plans.
GUIDELINES:
1. Consider experience level and fitness goals
2. Account for injuries or medical conditions
3. Respect schedule availability
4. Include warm-up and cool-down
5. Provide clear, safe instructions
${isArabic ? "ALL content MUST be in Arabic language." : ""}${knowledgeSection}
IMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, just raw JSON.`;

  const userPrompt = `Create a ${planDuration}-day workout plan ${isArabic ? "ENTIRELY IN ARABIC" : "in English"}:
GOALS: ${assessment.goals}
WEIGHT: ${assessment.currentWeight}kg, HEIGHT: ${assessment.height}cm
EXPERIENCE: ${assessment.experienceLevel}
SCHEDULE: ${JSON.stringify(assessment.scheduleAvailability)}
MEDICAL: ${assessment.medicalConditions?.join(", ") || "None"}
INJURIES: ${assessment.injuries?.join(", ") || "None"}
${checkIn ? `CHECK-IN: Weight ${checkIn.weight}kg, Energy ${checkIn.energyLevel}/10, Performance: ${checkIn.workoutPerformance || "N/A"}` : ""}

Return a JSON object with this structure:
{
  "weeklyPlan": { "monday": { ... }, ... },
  "progressionNotes": "string",
  "safetyTips": ["string", ...]
}`;

  // Create stream for live progress
  const streamId: string = await ctx.runMutation(
    internal.streamingManager.createStream,
    {},
  );

  const result = await generateText({
    model: openrouter("deepseek/deepseek-chat"),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.7,
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
  handler: async (ctx, { userId, checkInId, language, planDuration = 14 }) => {
    return generateMealPlanHandler(ctx, { userId, checkInId, language, planDuration });
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
  handler: async (ctx, { userId, checkInId, language, planDuration = 14 }) => {
    return generateWorkoutPlanHandler(ctx, { userId, checkInId, language, planDuration });
  },
});

// ---------------------------------------------------------------------------
// Dynamic plan-generation rate limiting
// ---------------------------------------------------------------------------

async function checkPlanGenerationLimit(ctx: ActionCtx, userId: string): Promise<void> {
  const frequencyDays: number = await ctx.runQuery(internal.helpers.getCheckInFrequencyInternal);
  const windowStart = Date.now() - frequencyDays * 24 * 60 * 60 * 1000;
  const recentCount: number = await ctx.runQuery(internal.helpers.countRecentPlans, { userId, since: windowStart });
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
  },
  returns: v.id("mealPlans"),
  handler: async (ctx, { checkInId, language, planDuration = 7 }): Promise<Id<"mealPlans">> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await checkPlanGenerationLimit(ctx, userId);

    return generateMealPlanHandler(ctx, { userId, checkInId, language, planDuration });
  },
});

export const generateWorkoutPlan = action({
  args: {
    checkInId: v.optional(v.id("checkIns")),
    language: v.union(v.literal("en"), v.literal("ar")),
    planDuration: v.optional(v.number()),
  },
  returns: v.id("workoutPlans"),
  handler: async (ctx, { checkInId, language, planDuration = 7 }): Promise<Id<"workoutPlans">> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await checkPlanGenerationLimit(ctx, userId);

    return generateWorkoutPlanHandler(ctx, { userId, checkInId, language, planDuration });
  },
});
