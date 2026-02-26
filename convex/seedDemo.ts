import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Populate demo data for the "near-expiry" user.
 * Expects the user + profile to already exist (created by seedActions:seedDemoUsers).
 */
export const populateNearExpiryUser = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const now = Date.now();
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Plan dates: started 25 days ago, expires in 3 days
    const planStart = new Date(today);
    planStart.setDate(planStart.getDate() - 25);
    const planEnd = new Date(today);
    planEnd.setDate(planEnd.getDate() + 3);
    const planStartStr = planStart.toISOString().split("T")[0];
    const planEndStr = planEnd.toISOString().split("T")[0];

    // Update profile with near-expiry dates
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new Error("Profile not found for near-expiry user");
    await ctx.db.patch(profile._id, {
      status: "active",
      planTier: "monthly",
      planStartDate: planStartStr,
      planEndDate: planEndStr,
      updatedAt: now,
    });

    // Assessment
    const existingAssessment = await ctx.db
      .query("initialAssessments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!existingAssessment) {
      await ctx.db.insert("initialAssessments", {
        userId,
        goals: "fat_loss",
        currentWeight: 85,
        height: 178,
        age: 28,
        gender: "male",
        activityLevel: "moderately_active",
        experienceLevel: "intermediate",
        exerciseHistory: "2 years of gym training",
        measurements: { chest: 100, waist: 88, hips: 95, arms: 35, thighs: 58 },
        scheduleAvailability: {
          days: ["sunday", "tuesday", "thursday", "saturday"],
          sessionDuration: 60,
          preferredTime: "morning",
        },
        foodPreferences: ["chicken", "rice", "eggs"],
        allergies: [],
        dietaryRestrictions: [],
        medicalConditions: [],
        injuries: [],
        lifestyleHabits: { equipment: "full_gym", mealsPerDay: 4 },
      });
    }

    // Check-ins (2)
    const checkIn1Date = new Date(today);
    checkIn1Date.setDate(checkIn1Date.getDate() - 14);
    const checkIn1 = await ctx.db.insert("checkIns", {
      userId,
      submittedAt: checkIn1Date.getTime(),
      weight: 84,
      measurements: { chest: 99, waist: 87, hips: 95, arms: 35, thighs: 57 },
      workoutPerformance: "good",
      energyLevel: 7,
      sleepQuality: 7,
      dietaryAdherence: 8,
      notes: "Feeling good, keeping consistent.",
    });

    const checkIn2Date = new Date(today);
    checkIn2Date.setDate(checkIn2Date.getDate() - 1);
    const checkIn2 = await ctx.db.insert("checkIns", {
      userId,
      submittedAt: checkIn2Date.getTime(),
      weight: 83,
      measurements: { chest: 99, waist: 86, hips: 94, arms: 35.5, thighs: 57 },
      workoutPerformance: "great",
      energyLevel: 8,
      sleepQuality: 8,
      dietaryAdherence: 9,
      notes: "Great progress this cycle!",
    });

    // Meal plan (current cycle)
    const mealPlanEnd = new Date(today);
    mealPlanEnd.setDate(mealPlanEnd.getDate() + 13);
    const mealPlan = await ctx.db.insert("mealPlans", {
      userId,
      checkInId: checkIn2,
      planData: {
        dailyCalories: 2200,
        macros: { protein: 180, carbs: 220, fat: 70 },
        meals: [
          { name: "Breakfast", time: "7:00 AM", foods: ["3 eggs + toast + fruit"], calories: 450, protein: 25, carbs: 45, fat: 18 },
          { name: "Lunch", time: "12:00 PM", foods: ["Grilled chicken + rice + salad"], calories: 650, protein: 45, carbs: 60, fat: 18 },
          { name: "Snack", time: "3:30 PM", foods: ["Greek yogurt + nuts + honey"], calories: 300, protein: 20, carbs: 25, fat: 14 },
          { name: "Dinner", time: "7:00 PM", foods: ["Fish + sweet potato + vegetables"], calories: 550, protein: 40, carbs: 50, fat: 15 },
          { name: "Post-workout", time: "9:00 PM", foods: ["Protein shake + banana"], calories: 250, protein: 30, carbs: 35, fat: 3 },
        ],
      },
      language: "en",
      startDate: todayStr,
      endDate: mealPlanEnd.toISOString().split("T")[0],
    });

    // Workout plan (current cycle)
    const workoutPlan = await ctx.db.insert("workoutPlans", {
      userId,
      checkInId: checkIn2,
      planData: {
        split: "upper_lower",
        daysPerWeek: 4,
        workouts: [
          {
            day: "Day 1 - Upper",
            exercises: [
              { name: "Bench Press", sets: 4, reps: "8-10", rest: "90s" },
              { name: "Barbell Row", sets: 4, reps: "8-10", rest: "90s" },
              { name: "Overhead Press", sets: 3, reps: "10-12", rest: "60s" },
              { name: "Lat Pulldown", sets: 3, reps: "10-12", rest: "60s" },
              { name: "Bicep Curls", sets: 3, reps: "12-15", rest: "45s" },
            ],
          },
          {
            day: "Day 2 - Lower",
            exercises: [
              { name: "Squats", sets: 4, reps: "8-10", rest: "120s" },
              { name: "Romanian Deadlift", sets: 4, reps: "8-10", rest: "90s" },
              { name: "Leg Press", sets: 3, reps: "10-12", rest: "90s" },
              { name: "Leg Curls", sets: 3, reps: "12-15", rest: "60s" },
              { name: "Calf Raises", sets: 4, reps: "15-20", rest: "45s" },
            ],
          },
        ],
      },
      language: "en",
      startDate: todayStr,
      endDate: mealPlanEnd.toISOString().split("T")[0],
    });

    // Some completions for the past 3 days
    for (let d = 3; d >= 1; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      const dateStr = date.toISOString().split("T")[0];

      // Meal completions
      for (let m = 0; m < 4; m++) {
        await ctx.db.insert("mealCompletions", {
          userId,
          mealPlanId: mealPlan,
          date: dateStr,
          mealIndex: m,
          completed: true,
        });
      }

      // Workout completion (every other day)
      if (d % 2 === 1) {
        await ctx.db.insert("workoutCompletions", {
          userId,
          workoutPlanId: workoutPlan,
          date: dateStr,
          workoutIndex: d === 3 ? 0 : 1,
          completed: true,
        });
      }
    }

    // Daily reflections
    for (let d = 3; d >= 1; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      await ctx.db.insert("dailyReflections", {
        userId,
        date: date.toISOString().split("T")[0],
        reflection: d === 3 ? "Great workout today!" : d === 2 ? "Rest day, ate clean." : "Solid upper body session.",
      });
    }

    // Ticket
    await ctx.db.insert("tickets", {
      userId,
      subject: "Question about protein timing",
      category: "meal_issue",
      status: "closed",
      messages: [
        { sender: "client", message: "Should I have protein shake before or after workout?", timestamp: now - 7 * 86400000 },
        { sender: "coach", message: "Within 2 hours post-workout is ideal. Pre-workout is optional.", timestamp: now - 6.5 * 86400000 },
        { sender: "client", message: "Thanks coach!", timestamp: now - 6 * 86400000 },
      ],
      updatedAt: now - 6 * 86400000,
    });

    return `Populated near-expiry user (${userId}) with assessment, 2 check-ins, plans, completions, reflections, and ticket.`;
  },
});

/**
 * Populate minimal data for the "expired" demo user.
 * Expects the user + profile to already exist.
 */
export const populateExpiredUser = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const now = Date.now();
    const today = new Date();

    // Plan dates: started 35 days ago, expired 5 days ago
    const planStart = new Date(today);
    planStart.setDate(planStart.getDate() - 35);
    const planEnd = new Date(today);
    planEnd.setDate(planEnd.getDate() - 5);

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new Error("Profile not found for expired user");
    await ctx.db.patch(profile._id, {
      status: "expired",
      planTier: "monthly",
      planStartDate: planStart.toISOString().split("T")[0],
      planEndDate: planEnd.toISOString().split("T")[0],
      inactiveSince: planEnd.getTime(),
      updatedAt: now,
    });

    // Minimal assessment
    const existingAssessment = await ctx.db
      .query("initialAssessments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!existingAssessment) {
      await ctx.db.insert("initialAssessments", {
        userId,
        goals: "muscle_gain",
        currentWeight: 72,
        height: 170,
        age: 25,
        gender: "male",
        activityLevel: "lightly_active",
        experienceLevel: "beginner",
      });
    }

    return `Populated expired user (${userId}) with assessment and expired profile.`;
  },
});
