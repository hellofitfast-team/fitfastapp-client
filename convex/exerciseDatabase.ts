import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireCoach } from "./helpers";

// ---------------------------------------------------------------------------
// Reusable validators
// ---------------------------------------------------------------------------

const categoryValidator = v.union(
  v.literal("compound"),
  v.literal("accessory"),
  v.literal("isolation"),
  v.literal("warmup"),
  v.literal("cooldown"),
  v.literal("cardio"),
);

const movementPatternValidator = v.union(
  v.literal("push"),
  v.literal("pull"),
  v.literal("squat"),
  v.literal("hinge"),
  v.literal("carry"),
  v.literal("rotation"),
  v.literal("other"),
);

const difficultyValidator = v.union(
  v.literal("beginner"),
  v.literal("intermediate"),
  v.literal("advanced"),
);

// ---------------------------------------------------------------------------
// Internal query — for workout engine action (no auth)
// ---------------------------------------------------------------------------

export const getActiveExercises = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Use by_category index — all categories with isActive=true
    // Collect from all categories to ensure we get everything active
    const exercises = await ctx.db.query("exerciseDatabase").collect();
    return exercises.filter((e) => e.isActive);
  },
});

// ---------------------------------------------------------------------------
// Coach queries
// ---------------------------------------------------------------------------

export const listExercises = query({
  args: {},
  handler: async (ctx) => {
    await requireCoach(ctx);

    const exercises = await ctx.db.query("exerciseDatabase").collect();

    // Sort by category then sortOrder
    const categoryOrder = ["compound", "accessory", "isolation", "warmup", "cooldown", "cardio"];
    const sorted = exercises.sort((a, b) => {
      const catDiff = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
      if (catDiff !== 0) return catDiff;
      return (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999);
    });

    // Resolve gifStorageId → URL for admin thumbnail display
    return Promise.all(
      sorted.map(async (ex) => {
        let imageUrl: string | undefined;
        if (ex.gifUrl) {
          imageUrl = ex.gifUrl;
        } else if (ex.gifStorageId) {
          imageUrl = (await ctx.storage.getUrl(ex.gifStorageId)) ?? undefined;
        }
        return { ...ex, imageUrl };
      }),
    );
  },
});

export const searchExercises = query({
  args: { query: v.string() },
  handler: async (ctx, { query: searchQuery }) => {
    await requireCoach(ctx);

    if (!searchQuery.trim()) return [];

    return ctx.db
      .query("exerciseDatabase")
      .withSearchIndex("search_name", (q) => q.search("name", searchQuery.trim()))
      .take(50);
  },
});

// ---------------------------------------------------------------------------
// Coach mutations
// ---------------------------------------------------------------------------

export const createExercise = mutation({
  args: {
    name: v.string(),
    nameAr: v.string(),
    category: categoryValidator,
    movementPattern: movementPatternValidator,
    primaryMuscles: v.array(v.string()),
    secondaryMuscles: v.array(v.string()),
    equipment: v.array(v.string()),
    difficulty: difficultyValidator,
    instructions: v.string(),
    instructionsAr: v.string(),
    contraindications: v.array(v.string()),
    defaultSets: v.number(),
    defaultRepsMin: v.number(),
    defaultRepsMax: v.number(),
    defaultRestSeconds: v.number(),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    gifUrl: v.optional(v.string()),
    gifStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireCoach(ctx);

    const now = Date.now();
    return ctx.db.insert("exerciseDatabase", {
      ...args,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateExercise = mutation({
  args: {
    id: v.id("exerciseDatabase"),
    name: v.optional(v.string()),
    nameAr: v.optional(v.string()),
    category: v.optional(categoryValidator),
    movementPattern: v.optional(movementPatternValidator),
    primaryMuscles: v.optional(v.array(v.string())),
    secondaryMuscles: v.optional(v.array(v.string())),
    equipment: v.optional(v.array(v.string())),
    difficulty: v.optional(difficultyValidator),
    instructions: v.optional(v.string()),
    instructionsAr: v.optional(v.string()),
    contraindications: v.optional(v.array(v.string())),
    defaultSets: v.optional(v.number()),
    defaultRepsMin: v.optional(v.number()),
    defaultRepsMax: v.optional(v.number()),
    defaultRestSeconds: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    gifUrl: v.optional(v.string()),
    gifStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireCoach(ctx);

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Exercise not found");

    // Filter out undefined fields
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const toggleActive = mutation({
  args: { id: v.id("exerciseDatabase") },
  handler: async (ctx, { id }) => {
    await requireCoach(ctx);

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Exercise not found");

    await ctx.db.patch(id, {
      isActive: !existing.isActive,
      updatedAt: Date.now(),
    });
  },
});

export const deleteExercise = mutation({
  args: { id: v.id("exerciseDatabase") },
  handler: async (ctx, { id }) => {
    await requireCoach(ctx);

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Exercise not found");

    // Soft-delete: deactivate instead of hard-deleting to preserve referential integrity
    // (existing workout plans may reference this exercise by name)
    await ctx.db.patch(id, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// Client query — exercise media lookup (authenticated, not coach-only)
// ---------------------------------------------------------------------------

const MAX_EXERCISE_MEDIA_IDS = 20;

export const getExerciseMedia = query({
  args: { exerciseIds: v.array(v.id("exerciseDatabase")) },
  handler: async (ctx, { exerciseIds }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId || exerciseIds.length > MAX_EXERCISE_MEDIA_IDS) return {};

    const result: Record<string, { gifUrl?: string; gifStorageUrl?: string }> = {};
    for (const id of exerciseIds) {
      const ex = await ctx.db.get(id);
      if (ex && (ex.gifUrl || ex.gifStorageId)) {
        const entry: { gifUrl?: string; gifStorageUrl?: string } = {};
        if (ex.gifUrl) entry.gifUrl = ex.gifUrl;
        if (ex.gifStorageId) {
          const url = await ctx.storage.getUrl(ex.gifStorageId);
          if (url) entry.gifStorageUrl = url;
        }
        result[id] = entry;
      }
    }
    return result;
  },
});

// ---------------------------------------------------------------------------
// Internal mutation — for seeding
// ---------------------------------------------------------------------------

export const bulkInsert = internalMutation({
  args: {
    exercises: v.array(
      v.object({
        name: v.string(),
        nameAr: v.string(),
        category: categoryValidator,
        movementPattern: movementPatternValidator,
        primaryMuscles: v.array(v.string()),
        secondaryMuscles: v.array(v.string()),
        equipment: v.array(v.string()),
        difficulty: difficultyValidator,
        instructions: v.string(),
        instructionsAr: v.string(),
        contraindications: v.array(v.string()),
        defaultSets: v.number(),
        defaultRepsMin: v.number(),
        defaultRepsMax: v.number(),
        defaultRestSeconds: v.number(),
        sortOrder: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, { exercises }) => {
    const now = Date.now();
    const ids = [];
    for (const exercise of exercises) {
      const id = await ctx.db.insert("exerciseDatabase", {
        ...exercise,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      ids.push(id);
    }
    return ids;
  },
});
