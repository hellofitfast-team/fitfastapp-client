import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/** Reusable language validator */
const languageValidator = v.union(v.literal("en"), v.literal("ar"));

/** Reusable plan tier validator (includes legacy values for backward compat) */
const planTierValidator = v.union(
  v.literal("monthly"),
  v.literal("quarterly"),
  // Legacy values — kept for backward compat with existing data
  v.literal("3_months"),
  v.literal("6_months"),
  v.literal("12_months"),
);

/** Reusable food category validator */
const foodCategoryValidator = v.union(
  v.literal("protein"),
  v.literal("carb"),
  v.literal("fat"),
  v.literal("vegetable"),
  v.literal("fruit"),
  v.literal("dairy"),
  v.literal("dessert"),
  v.literal("recipe"),
);

/** Reusable food source validator */
const foodSourceValidator = v.union(
  v.literal("usda"),
  v.literal("coach"),
  v.literal("verified_recipe"),
);

/** Reusable file purpose validator */
const filePurposeValidator = v.union(
  v.literal("progress_photo"),
  v.literal("ticket_screenshot"),
  v.literal("payment_proof"),
  v.literal("knowledge_pdf"),
  v.literal("exercise_media"),
);

/** Reusable gender validator */
const genderValidator = v.union(v.literal("male"), v.literal("female"));

/** Reusable OCR extracted data validator for payment screenshots */
const ocrExtractedDataValidator = v.object({
  amount: v.optional(v.string()),
  sender_name: v.optional(v.string()),
  reference_number: v.optional(v.string()),
  date: v.optional(v.string()),
  bank: v.optional(v.string()),
});

export default defineSchema({
  ...authTables,

  profiles: defineTable({
    userId: v.string(), // Convex Auth user ID (references users._id)
    fullName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    language: languageValidator,
    planTier: v.optional(planTierValidator),
    status: v.union(
      v.literal("pending_approval"),
      v.literal("active"),
      v.literal("inactive"),
      v.literal("expired"),
    ),
    planStartDate: v.optional(v.string()),
    planEndDate: v.optional(v.string()),
    isCoach: v.boolean(),
    notificationReminderTime: v.optional(v.string()),
    inactiveSince: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_isCoach", ["isCoach"])
    .index("by_status", ["status"]),

  assessmentHistory: defineTable({
    userId: v.string(),
    assessmentSnapshot: v.any(),
    changedFields: v.array(v.string()),
    versionNumber: v.number(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  initialAssessments: defineTable({
    userId: v.string(),
    goals: v.optional(v.string()),
    currentWeight: v.optional(v.number()),
    height: v.optional(v.number()),
    measurements: v.optional(
      v.object({
        chest: v.optional(v.number()),
        waist: v.optional(v.number()),
        hips: v.optional(v.number()),
        arms: v.optional(v.number()),
        thighs: v.optional(v.number()),
      }),
    ),
    scheduleAvailability: v.optional(
      v.object({
        days: v.optional(v.array(v.string())),
        sessionDuration: v.optional(v.number()),
        preferredTime: v.optional(v.string()),
      }),
    ),
    foodPreferences: v.optional(v.array(v.string())),
    allergies: v.optional(v.array(v.string())),
    dietaryRestrictions: v.optional(v.array(v.string())),
    medicalConditions: v.optional(v.array(v.string())),
    injuries: v.optional(v.array(v.string())),
    age: v.optional(v.number()),
    gender: v.optional(genderValidator),
    exerciseHistory: v.optional(v.string()),
    activityLevel: v.optional(
      v.union(
        v.literal("sedentary"),
        v.literal("lightly_active"),
        v.literal("moderately_active"),
        v.literal("very_active"),
      ),
    ),
    experienceLevel: v.optional(
      v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    ),
    lifestyleHabits: v.optional(
      v.object({
        equipment: v.optional(v.string()),
        mealsPerDay: v.optional(v.number()),
      }),
    ),
    measurementMethod: v.optional(v.union(v.literal("manual"), v.literal("inbody"))),
    inBodyStorageId: v.optional(v.id("_storage")),
    inBodyData: v.optional(
      v.object({
        bodyFatPercentage: v.optional(v.number()),
        leanBodyMass: v.optional(v.number()),
        skeletalMuscleMass: v.optional(v.number()),
        bmi: v.optional(v.number()),
        visceralFatLevel: v.optional(v.number()),
        basalMetabolicRate: v.optional(v.number()),
        totalBodyWater: v.optional(v.number()),
      }),
    ),
  }).index("by_userId", ["userId"]),

  checkIns: defineTable({
    userId: v.string(),
    submittedAt: v.optional(v.number()),
    weight: v.optional(v.number()),
    measurementMethod: v.optional(v.union(v.literal("manual"), v.literal("inbody"))),
    measurements: v.optional(
      v.object({
        chest: v.optional(v.number()),
        waist: v.optional(v.number()),
        hips: v.optional(v.number()),
        arms: v.optional(v.number()),
        thighs: v.optional(v.number()),
      }),
    ),
    inBodyStorageId: v.optional(v.id("_storage")),
    inBodyData: v.optional(
      v.object({
        bodyFatPercentage: v.optional(v.number()),
        leanBodyMass: v.optional(v.number()),
        skeletalMuscleMass: v.optional(v.number()),
        bmi: v.optional(v.number()),
        visceralFatLevel: v.optional(v.number()),
        basalMetabolicRate: v.optional(v.number()),
        totalBodyWater: v.optional(v.number()),
      }),
    ),
    workoutPerformance: v.optional(v.string()),
    energyLevel: v.optional(v.number()),
    sleepQuality: v.optional(v.number()),
    dietaryAdherence: v.optional(v.number()),
    newInjuries: v.optional(v.string()),
    progressPhotoIds: v.optional(v.array(v.id("_storage"))),
    progressPhotoFront: v.optional(v.id("_storage")),
    progressPhotoBack: v.optional(v.id("_storage")),
    progressPhotoSide: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  mealPlans: defineTable({
    userId: v.string(),
    checkInId: v.optional(v.id("checkIns")),
    planData: v.any(),
    aiGeneratedContent: v.optional(v.string()),
    streamId: v.optional(v.string()),
    language: languageValidator,
    startDate: v.string(),
    endDate: v.string(),
    translatedPlanData: v.optional(v.any()),
    translatedLanguage: v.optional(languageValidator),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_dates", ["userId", "startDate", "endDate"]),

  workoutPlans: defineTable({
    userId: v.string(),
    checkInId: v.optional(v.id("checkIns")),
    planData: v.any(),
    aiGeneratedContent: v.optional(v.string()),
    streamId: v.optional(v.string()),
    language: languageValidator,
    startDate: v.string(),
    endDate: v.string(),
    translatedPlanData: v.optional(v.any()),
    translatedLanguage: v.optional(languageValidator),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_dates", ["userId", "startDate", "endDate"]),

  mealCompletions: defineTable({
    userId: v.string(),
    mealPlanId: v.id("mealPlans"),
    date: v.string(),
    mealIndex: v.number(),
    completed: v.boolean(),
    notes: v.optional(v.string()),
  })
    .index("by_userId_date", ["userId", "date"])
    .index("by_planId_date", ["mealPlanId", "date"]),

  workoutCompletions: defineTable({
    userId: v.string(),
    workoutPlanId: v.id("workoutPlans"),
    date: v.string(),
    workoutIndex: v.number(),
    completed: v.boolean(),
    notes: v.optional(v.string()),
  })
    .index("by_userId_date", ["userId", "date"])
    .index("by_planId_date", ["workoutPlanId", "date"]),

  dailyReflections: defineTable({
    userId: v.string(),
    date: v.string(),
    reflection: v.optional(v.string()),
  }).index("by_userId_date", ["userId", "date"]),

  tickets: defineTable({
    userId: v.string(),
    subject: v.string(),
    category: v.optional(
      v.union(
        v.literal("meal_issue"),
        v.literal("workout_issue"),
        v.literal("technical"),
        v.literal("bug_report"),
        v.literal("other"),
      ),
    ),
    description: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("coach_responded"), v.literal("closed")),
    messages: v.array(
      v.object({
        sender: v.union(v.literal("client"), v.literal("coach")),
        message: v.string(),
        timestamp: v.number(),
      }),
    ),
    screenshotId: v.optional(v.id("_storage")),
    deviceInfo: v.optional(
      v.object({
        browser: v.optional(v.string()),
        os: v.optional(v.string()),
        screenSize: v.optional(v.string()),
        userAgent: v.optional(v.string()),
      }),
    ),
    pageUrl: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_status", ["userId", "status"])
    .index("by_status", ["status"])
    .index("by_updatedAt", ["updatedAt"])
    .searchIndex("search_subject", {
      searchField: "subject",
      filterFields: ["status", "userId"],
    }),

  faqs: defineTable({
    question: v.string(),
    answer: v.string(),
    language: languageValidator,
    displayOrder: v.number(),
    updatedAt: v.number(),
  }).index("by_language_order", ["language", "displayOrder"]),

  pendingSignups: defineTable({
    email: v.string(),
    fullName: v.string(),
    phone: v.optional(v.string()),
    planId: v.optional(v.string()),
    planTier: v.optional(planTierValidator),
    transferReferenceNumber: v.optional(v.string()),
    transferAmount: v.optional(v.string()),
    paymentScreenshotId: v.optional(v.id("_storage")),
    ocrExtractedData: v.optional(ocrExtractedDataValidator),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    reviewedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    inviteToken: v.optional(v.string()),
    inviteExpiresAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_email", ["email"])
    .index("by_email_status", ["email", "status"])
    .index("by_inviteToken", ["inviteToken"]),

  systemConfig: defineTable({
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  pushSubscriptions: defineTable({
    userId: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    deviceType: v.optional(v.string()),
    isActive: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_endpoint", ["endpoint"])
    .index("by_isActive", ["isActive"]),

  fileMetadata: defineTable({
    storageId: v.id("_storage"),
    uploadedBy: v.string(),
    uploadedAt: v.number(),
    purpose: filePurposeValidator,
  })
    .index("by_storageId", ["storageId"])
    .index("by_uploadedBy", ["uploadedBy"])
    .index("by_uploadedAt", ["uploadedAt"]),

  foodDatabase: defineTable({
    name: v.string(),
    nameAr: v.optional(v.string()),
    category: foodCategoryValidator,
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
    source: foodSourceValidator,
    isVerified: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_isRecipe", ["isRecipe"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["category", "isRecipe"],
    }),

  notificationLog: defineTable({
    type: v.union(
      v.literal("plan_ready"),
      v.literal("reminder"),
      v.literal("broadcast"),
      v.literal("individual"),
    ),
    title: v.string(),
    body: v.string(),
    recipientCount: v.number(),
    recipientUserId: v.optional(v.string()),
    sentAt: v.number(),
    sentBy: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed"), v.literal("partial")),
    failedCount: v.optional(v.number()),
  }).index("by_sentAt", ["sentAt"]),

  coachKnowledge: defineTable({
    title: v.string(),
    type: v.union(v.literal("text"), v.literal("pdf")),
    content: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_createdAt", ["createdAt"]),

  exerciseDatabase: defineTable({
    name: v.string(),
    nameAr: v.string(),
    category: v.union(
      v.literal("compound"),
      v.literal("accessory"),
      v.literal("isolation"),
      v.literal("warmup"),
      v.literal("cooldown"),
      v.literal("cardio"),
    ),
    movementPattern: v.union(
      v.literal("push"),
      v.literal("pull"),
      v.literal("squat"),
      v.literal("hinge"),
      v.literal("carry"),
      v.literal("rotation"),
      v.literal("other"),
    ),
    primaryMuscles: v.array(v.string()),
    secondaryMuscles: v.array(v.string()),
    equipment: v.array(v.string()),
    difficulty: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    instructions: v.string(),
    instructionsAr: v.string(),
    contraindications: v.array(v.string()),
    defaultSets: v.number(),
    defaultRepsMin: v.number(),
    defaultRepsMax: v.number(),
    defaultRestSeconds: v.number(),
    isActive: v.boolean(),
    sortOrder: v.optional(v.number()),
    gifUrl: v.optional(v.string()),
    gifStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category", "isActive"])
    .index("by_movement", ["movementPattern", "isActive"])
    .index("by_difficulty", ["difficulty", "isActive"])
    .searchIndex("search_name", { searchField: "name" }),
});
