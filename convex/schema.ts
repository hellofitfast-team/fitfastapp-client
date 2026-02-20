import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  profiles: defineTable({
    userId: v.string(), // Clerk user ID (e.g. "user_2abc...")
    fullName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    language: v.union(v.literal("en"), v.literal("ar")),
    planTier: v.optional(
      v.union(
        v.literal("3_months"),
        v.literal("6_months"),
        v.literal("12_months"),
      ),
    ),
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
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_isCoach", ["isCoach"])
    .index("by_status", ["status"]),

  initialAssessments: defineTable({
    userId: v.string(),
    goals: v.optional(v.string()),
    currentWeight: v.optional(v.number()),
    height: v.optional(v.number()),
    measurements: v.optional(v.any()),
    scheduleAvailability: v.optional(v.any()),
    foodPreferences: v.optional(v.array(v.string())),
    allergies: v.optional(v.array(v.string())),
    dietaryRestrictions: v.optional(v.array(v.string())),
    medicalConditions: v.optional(v.array(v.string())),
    injuries: v.optional(v.array(v.string())),
    exerciseHistory: v.optional(v.string()),
    experienceLevel: v.optional(
      v.union(
        v.literal("beginner"),
        v.literal("intermediate"),
        v.literal("advanced"),
      ),
    ),
    lifestyleHabits: v.optional(v.any()),
  }).index("by_userId", ["userId"]),

  checkIns: defineTable({
    userId: v.string(),
    weight: v.optional(v.number()),
    measurements: v.optional(v.any()),
    workoutPerformance: v.optional(v.string()),
    energyLevel: v.optional(v.number()),
    sleepQuality: v.optional(v.number()),
    dietaryAdherence: v.optional(v.number()),
    newInjuries: v.optional(v.string()),
    progressPhotoIds: v.optional(v.array(v.id("_storage"))),
    notes: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  mealPlans: defineTable({
    userId: v.string(),
    checkInId: v.optional(v.id("checkIns")),
    planData: v.any(),
    aiGeneratedContent: v.optional(v.string()),
    streamId: v.optional(v.string()),
    language: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_dates", ["userId", "startDate", "endDate"]),

  workoutPlans: defineTable({
    userId: v.string(),
    checkInId: v.optional(v.id("checkIns")),
    planData: v.any(),
    aiGeneratedContent: v.optional(v.string()),
    streamId: v.optional(v.string()),
    language: v.string(),
    startDate: v.string(),
    endDate: v.string(),
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
    status: v.union(
      v.literal("open"),
      v.literal("coach_responded"),
      v.literal("closed"),
    ),
    messages: v.array(
      v.object({
        sender: v.union(v.literal("client"), v.literal("coach")),
        message: v.string(),
        timestamp: v.number(),
      }),
    ),
    screenshotId: v.optional(v.id("_storage")),
    deviceInfo: v.optional(v.any()),
    pageUrl: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),

  faqs: defineTable({
    question: v.string(),
    answer: v.string(),
    language: v.union(v.literal("en"), v.literal("ar")),
    displayOrder: v.number(),
    updatedAt: v.number(),
  }).index("by_language_order", ["language", "displayOrder"]),

  pendingSignups: defineTable({
    email: v.string(),
    fullName: v.string(),
    phone: v.optional(v.string()),
    planId: v.optional(v.string()),
    planTier: v.optional(
      v.union(
        v.literal("3_months"),
        v.literal("6_months"),
        v.literal("12_months"),
      ),
    ),
    paymentScreenshotId: v.optional(v.id("_storage")),
    ocrExtractedData: v.optional(v.any()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    reviewedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    clerkInvitationId: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_email", ["email"]),

  systemConfig: defineTable({
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  pushSubscriptions: defineTable({
    userId: v.string(),
    onesignalSubscriptionId: v.string(),
    deviceType: v.optional(v.string()),
    isActive: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_subscriptionId", ["onesignalSubscriptionId"]),

  fileMetadata: defineTable({
    storageId: v.id("_storage"),
    uploadedBy: v.string(),
    uploadedAt: v.number(),
    purpose: v.string(), // "progress_photo" | "ticket_screenshot" | "payment_proof" | "knowledge_pdf"
  })
    .index("by_storageId", ["storageId"])
    .index("by_uploadedBy", ["uploadedBy"]),

  coachKnowledge: defineTable({
    title: v.string(),
    type: v.union(v.literal("text"), v.literal("pdf")),
    content: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_createdAt", ["createdAt"]),
});
