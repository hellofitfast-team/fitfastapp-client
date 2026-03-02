import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { getAuthUserId } from "./auth";

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

export const listFoods = query({
  args: {
    category: v.optional(v.string()),
    isRecipe: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { category, isRecipe, search: searchQuery }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Full-text search when a query is provided
    if (searchQuery && searchQuery.trim().length > 0) {
      let searchBuilder = ctx.db.query("foodDatabase").withSearchIndex("search_name", (q) => {
        let sq = q.search("name", searchQuery.trim());
        if (category) sq = sq.eq("category", category);
        if (isRecipe !== undefined) sq = sq.eq("isRecipe", isRecipe);
        return sq;
      });
      return searchBuilder.collect();
    }

    // Filtered list
    if (category) {
      return ctx.db
        .query("foodDatabase")
        .withIndex("by_category", (q) => q.eq("category", category))
        .collect();
    }

    if (isRecipe !== undefined) {
      return ctx.db
        .query("foodDatabase")
        .withIndex("by_isRecipe", (q) => q.eq("isRecipe", isRecipe))
        .collect();
    }

    return ctx.db.query("foodDatabase").collect();
  },
});

// ---------------------------------------------------------------------------
// Internal query — compact food reference for AI prompt
// ---------------------------------------------------------------------------

export const getFoodReferenceForPrompt = internalQuery({
  args: {},
  handler: async (ctx): Promise<string> => {
    const foods = await ctx.db.query("foodDatabase").collect();
    if (foods.length === 0) return "";

    // Cap at 80 ingredients + 20 recipes to keep prompt under ~1500 tokens
    const ingredients = foods.filter((f) => !f.isRecipe).slice(0, 80);
    const recipes = foods.filter((f) => f.isRecipe).slice(0, 20);

    let result = "";

    if (ingredients.length > 0) {
      result += "FOOD REFERENCE DATABASE (use these verified macros — DO NOT estimate):\n";
      result += "Name | Cal/100g | Protein | Carbs | Fat\n";
      for (const food of ingredients) {
        const p = food.per100g;
        result += `${food.name} | ${p.calories} | ${p.protein}g | ${p.carbs}g | ${p.fat}g\n`;
      }
    }

    if (recipes.length > 0) {
      result += "\nHEALTHY RECIPES (include 1-2 of these per day for variety):\n";
      for (const recipe of recipes) {
        const ps = recipe.perServing;
        const tags = recipe.tags.join(", ");
        result += `- ${recipe.name} [${tags}]`;
        if (ps) {
          result += ` | Per serving: ${ps.calories} cal, ${ps.protein}g P, ${ps.carbs}g C, ${ps.fat}g F`;
        }
        if (recipe.servingSize) {
          result += ` | Serving: ${recipe.servingSize}`;
        }
        result += "\n";
      }
      result +=
        "\nINSTRUCTION: Include at least 1 fun/treat meal per day from the recipe database (healthy desserts or 'junk made healthy').\n";
    }

    return result;
  },
});

// ---------------------------------------------------------------------------
// Coach mutations
// ---------------------------------------------------------------------------

export const addFood = mutation({
  args: {
    name: v.string(),
    nameAr: v.optional(v.string()),
    category: v.string(),
    tags: v.array(v.string()),
    per100g: v.object({
      calories: v.number(),
      protein: v.number(),
      carbs: v.number(),
      fat: v.number(),
      fiber: v.optional(v.number()),
    }),
    isRecipe: v.boolean(),
    servingSize: v.optional(v.string()),
    perServing: v.optional(
      v.object({
        calories: v.number(),
        protein: v.number(),
        carbs: v.number(),
        fat: v.number(),
      }),
    ),
    ingredients: v.optional(v.array(v.string())),
    instructions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.isCoach) throw new Error("Not authorized");

    const now = Date.now();
    return ctx.db.insert("foodDatabase", {
      ...args,
      source: "coach",
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteFood = mutation({
  args: { foodId: v.id("foodDatabase") },
  handler: async (ctx, { foodId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.isCoach) throw new Error("Not authorized");

    await ctx.db.delete(foodId);
  },
});

// ---------------------------------------------------------------------------
// Internal mutation — used by seed action
// ---------------------------------------------------------------------------

export const insertFood = internalMutation({
  args: {
    name: v.string(),
    nameAr: v.optional(v.string()),
    category: v.string(),
    tags: v.array(v.string()),
    per100g: v.object({
      calories: v.number(),
      protein: v.number(),
      carbs: v.number(),
      fat: v.number(),
      fiber: v.optional(v.number()),
    }),
    isRecipe: v.boolean(),
    servingSize: v.optional(v.string()),
    perServing: v.optional(
      v.object({
        calories: v.number(),
        protein: v.number(),
        carbs: v.number(),
        fat: v.number(),
      }),
    ),
    ingredients: v.optional(v.array(v.string())),
    instructions: v.optional(v.array(v.string())),
    source: v.string(),
    isVerified: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("foodDatabase", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});
