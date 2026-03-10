import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ---------------------------------------------------------------------------
// One-time helpers for the exercise image upload script.
// These are public mutations so the external Node.js script can call them
// via ConvexHttpClient. Safe to remove after images are populated.
// ---------------------------------------------------------------------------

/** Returns a pre-signed upload URL for Convex storage. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/** Links a storage ID to an exercise record by name. */
export const linkImageToExercise = mutation({
  args: {
    exerciseName: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { exerciseName, storageId }) => {
    const exercise = await ctx.db
      .query("exerciseDatabase")
      .filter((q) => q.eq(q.field("name"), exerciseName))
      .first();

    if (!exercise) {
      console.warn(`Exercise not found: ${exerciseName}`);
      return { success: false, reason: "not_found" };
    }

    await ctx.db.patch(exercise._id, {
      gifStorageId: storageId,
      updatedAt: Date.now(),
    });

    return { success: true, exerciseId: exercise._id };
  },
});

/** Lists all exercises, indicating which ones already have images. */
export const listExercisesForImageGen = query({
  args: {},
  handler: async (ctx) => {
    const exercises = await ctx.db.query("exerciseDatabase").collect();
    return exercises.map((ex) => ({
      name: ex.name,
      primaryMuscles: ex.primaryMuscles,
      equipment: ex.equipment,
      category: ex.category,
      hasImage: !!ex.gifStorageId || !!ex.gifUrl,
    }));
  },
});
