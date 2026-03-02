import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// ============================================================================
// Helper queries (previously seedDemo_helpers.ts)
// ============================================================================

/** Find an auth account by email. Used by seedActions:seedDemoUsers to get userId. */
export const findAuthAccountByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(q.eq(q.field("provider"), "password"), q.eq(q.field("providerAccountId"), email)),
      )
      .first();
  },
});

/**
 * Seed the database with test data.
 * Run from Convex dashboard or CLI.
 */
export const seedConfig = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "check_in_frequency_days"))
      .unique();
    if (existing) {
      return "Already seeded — skipping config.";
    }

    const now = Date.now();

    // System config
    await ctx.db.insert("systemConfig", {
      key: "check_in_frequency_days",
      value: 14,
      updatedAt: now,
    });

    return "Config seeded.";
  },
});

export const seedFAQs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("faqs").first();
    if (existing) {
      return "FAQs already seeded — skipping.";
    }

    const now = Date.now();

    const enFaqs = [
      {
        q: "How often do I submit check-ins?",
        a: "Check-ins are submitted every 14 days (2 weeks). Your coach will review your progress and adjust your plans accordingly.",
      },
      {
        q: "Can I change my meal plan?",
        a: "Your meal plan is AI-generated based on your goals and preferences. A new plan is created after each check-in. You can always contact your coach for adjustments.",
      },
      {
        q: "What if I miss a workout?",
        a: "No worries! Just continue with your next scheduled workout. Consistency over perfection. If you need to adjust your schedule, let your coach know.",
      },
      {
        q: "How do I track my progress?",
        a: "Use the Tracking page daily to mark meals and workouts as complete. Submit check-ins every 2 weeks with your weight and progress photos.",
      },
      {
        q: "How do I contact my coach?",
        a: "Use the Tickets page to send a message to your coach. They'll respond as soon as possible.",
      },
      {
        q: "What payment methods are accepted?",
        a: "We accept InstaPay transfers. Upload your payment screenshot during signup and your coach will verify it.",
      },
      {
        q: "How do I change the app language?",
        a: "Tap the language switcher (AR/EN) in the top-right corner of any page to switch between English and Arabic.",
      },
    ];

    for (let i = 0; i < enFaqs.length; i++) {
      await ctx.db.insert("faqs", {
        question: enFaqs[i].q,
        answer: enFaqs[i].a,
        language: "en",
        displayOrder: i,
        updatedAt: now,
      });
    }

    const arFaqs = [
      {
        q: "كم مرة أقدم تقرير متابعة؟",
        a: "يتم تقديم تقارير المتابعة كل 14 يوم (أسبوعين). سيراجع مدربك تقدمك ويعدل خططك وفقاً لذلك.",
      },
      {
        q: "هل يمكنني تغيير خطة الوجبات؟",
        a: "خطة الوجبات يتم إنشاؤها بالذكاء الاصطناعي بناءً على أهدافك وتفضيلاتك. يتم إنشاء خطة جديدة بعد كل تقرير متابعة.",
      },
      {
        q: "ماذا لو فاتني تمرين؟",
        a: "لا تقلق! فقط استمر في التمرين المجدول التالي. الاستمرارية أهم من الكمال.",
      },
      {
        q: "كيف أتتبع تقدمي؟",
        a: "استخدم صفحة التتبع يومياً لتحديد الوجبات والتمارين المكتملة. قدم تقارير المتابعة كل أسبوعين.",
      },
      {
        q: "كيف أتواصل مع مدربي؟",
        a: "استخدم صفحة التذاكر لإرسال رسالة إلى مدربك. سيرد في أقرب وقت ممكن.",
      },
      {
        q: "ما هي طرق الدفع المقبولة؟",
        a: "نقبل تحويلات InstaPay. ارفع لقطة شاشة الدفع أثناء التسجيل وسيتحقق منها مدربك.",
      },
      {
        q: "كيف أغير لغة التطبيق؟",
        a: "اضغط على زر تبديل اللغة (AR/EN) في الزاوية العلوية اليمنى لأي صفحة.",
      },
    ];

    for (let i = 0; i < arFaqs.length; i++) {
      await ctx.db.insert("faqs", {
        question: arFaqs[i].q,
        answer: arFaqs[i].a,
        language: "ar",
        displayOrder: i,
        updatedAt: now,
      });
    }

    return "FAQs seeded (7 EN + 7 AR).";
  },
});

/**
 * Promote a user to coach by Convex Auth user ID.
 * Run: npx convex run seed:makeCoach '{"userId":"..."}'
 */
export const makeCoach = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) {
      // Create profile if it doesn't exist (e.g. webhook didn't fire)
      await ctx.db.insert("profiles", {
        userId,
        email: undefined,
        fullName: "Coach",
        language: "en",
        status: "active",
        isCoach: true,
        updatedAt: Date.now(),
      });
      return `Created new coach profile for ${userId}.`;
    }

    await ctx.db.patch(profile._id, {
      isCoach: true,
      status: "active",
      fullName: profile.fullName || "Coach",
      updatedAt: Date.now(),
    });

    return `${userId} is now a coach.`;
  },
});

/**
 * Activate a client account by Convex Auth user ID.
 * Run: npx convex run seed:activateClient '{"userId":"..."}'
 */
export const activateClient = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) {
      throw new Error(`No profile found for userId: ${userId}`);
    }

    const planTier = (profile.planTier as "monthly" | "quarterly") ?? "monthly";
    const planMonths = planTier === "quarterly" ? 3 : 1;
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + planMonths);

    await ctx.db.patch(profile._id, {
      status: "active",
      planTier,
      planStartDate: new Date().toISOString().split("T")[0],
      planEndDate: endDate.toISOString().split("T")[0],
      updatedAt: Date.now(),
    });

    return `${userId} is now active with ${planTier} plan.`;
  },
});

/**
 * Main seed — seeds config + FAQs.
 * Run: npx convex run seed:run
 */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Inline the seeding logic to avoid runMutation from mutation
    // Seed config
    const existingConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "check_in_frequency_days"))
      .unique();

    const now = Date.now();

    if (!existingConfig) {
      await ctx.db.insert("systemConfig", {
        key: "check_in_frequency_days",
        value: 14,
        updatedAt: now,
      });
    }

    // Seed FAQs
    const existingFaq = await ctx.db.query("faqs").first();
    if (!existingFaq) {
      const enFaqs = [
        {
          q: "How often do I submit check-ins?",
          a: "Check-ins are submitted every 14 days. Your coach will review your progress and adjust your plans.",
        },
        {
          q: "Can I change my meal plan?",
          a: "Your meal plan is AI-generated based on your goals. A new plan is created after each check-in.",
        },
        {
          q: "What if I miss a workout?",
          a: "No worries! Just continue with your next scheduled workout. Consistency over perfection.",
        },
        {
          q: "How do I track my progress?",
          a: "Use the Tracking page daily to mark meals and workouts complete. Submit check-ins every 2 weeks.",
        },
        {
          q: "How do I contact my coach?",
          a: "Use the Tickets page to send a message to your coach.",
        },
        {
          q: "What payment methods are accepted?",
          a: "We accept InstaPay transfers. Upload your payment screenshot during signup.",
        },
        {
          q: "How do I change the app language?",
          a: "Tap the language switcher (AR/EN) in the top-right corner of any page.",
        },
      ];
      for (let i = 0; i < enFaqs.length; i++) {
        await ctx.db.insert("faqs", {
          question: enFaqs[i].q,
          answer: enFaqs[i].a,
          language: "en",
          displayOrder: i,
          updatedAt: now,
        });
      }

      const arFaqs = [
        {
          q: "كم مرة أقدم تقرير متابعة؟",
          a: "يتم تقديم تقارير المتابعة كل 14 يوم. سيراجع مدربك تقدمك ويعدل خططك.",
        },
        {
          q: "هل يمكنني تغيير خطة الوجبات؟",
          a: "خطة الوجبات يتم إنشاؤها بالذكاء الاصطناعي بناءً على أهدافك وتفضيلاتك.",
        },
        { q: "ماذا لو فاتني تمرين؟", a: "لا تقلق! فقط استمر في التمرين المجدول التالي." },
        {
          q: "كيف أتتبع تقدمي؟",
          a: "استخدم صفحة التتبع يومياً لتحديد الوجبات والتمارين المكتملة.",
        },
        { q: "كيف أتواصل مع مدربي؟", a: "استخدم صفحة التذاكر لإرسال رسالة إلى مدربك." },
        {
          q: "ما هي طرق الدفع المقبولة؟",
          a: "نقبل تحويلات InstaPay. ارفع لقطة شاشة الدفع أثناء التسجيل.",
        },
        { q: "كيف أغير لغة التطبيق؟", a: "اضغط على زر تبديل اللغة (AR/EN) في الزاوية العلوية." },
      ];
      for (let i = 0; i < arFaqs.length; i++) {
        await ctx.db.insert("faqs", {
          question: arFaqs[i].q,
          answer: arFaqs[i].a,
          language: "ar",
          displayOrder: i,
          updatedAt: now,
        });
      }
    }

    return "Seed complete! Config + FAQs populated.";
  },
});

/** Insert a pre-hashed auth user into the database. Called by seedActions:seedTestUsers. */
export const insertAuthUser = internalMutation({
  args: {
    email: v.string(),
    hashedPassword: v.string(),
    fullName: v.string(),
    isCoach: v.boolean(),
  },
  handler: async (ctx, { email, hashedPassword, fullName, isCoach }) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(q.eq(q.field("provider"), "password"), q.eq(q.field("providerAccountId"), email)),
      )
      .first();

    if (existing) {
      return `User ${email} already exists — skipped.`;
    }

    // Create user in auth tables
    const userId = await ctx.db.insert("users", { email });

    await ctx.db.insert("authAccounts", {
      userId,
      provider: "password",
      providerAccountId: email,
      secret: hashedPassword,
    });

    // Create profile
    await ctx.db.insert("profiles", {
      userId,
      email,
      fullName,
      language: "en",
      status: "active",
      isCoach,
      planTier: isCoach ? undefined : ("monthly" as const),
      planStartDate: isCoach ? undefined : new Date().toISOString().split("T")[0],
      planEndDate: isCoach
        ? undefined
        : (() => {
            const d = new Date();
            d.setMonth(d.getMonth() + 1);
            return d.toISOString().split("T")[0];
          })(),
      updatedAt: Date.now(),
    });

    return `Created ${isCoach ? "coach" : "client"}: ${email} (userId: ${userId})`;
  },
});

/** Shared helper: delete all docs in a table matching userId via index. */
async function deleteByUserIdIndex(
  ctx: { db: any },
  userId: string,
  table: string,
  indexName: string,
): Promise<number> {
  const docs = await ctx.db
    .query(table)
    .withIndex(indexName, (q: any) => q.eq("userId", userId))
    .collect();
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
  return docs.length;
}

/** Common table list for cascade-deleting all user data by indexed tables. */
const USER_DATA_TABLES = [
  ["dailyReflections", "by_userId_date"],
  ["mealCompletions", "by_userId_date"],
  ["workoutCompletions", "by_userId_date"],
  ["mealPlans", "by_userId"],
  ["workoutPlans", "by_userId"],
  ["checkIns", "by_userId"],
  ["initialAssessments", "by_userId"],
  ["assessmentHistory", "by_userId"],
  ["tickets", "by_userId"],
  ["pushSubscriptions", "by_userId"],
] as const;

/** Full cascade-delete a user by email: auth tables + profile + all data. */
export const deleteUserByEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    // Find auth account
    const authAccount = await ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(q.eq(q.field("provider"), "password"), q.eq(q.field("providerAccountId"), email)),
      )
      .first();
    if (!authAccount) return `No user found with email ${email}`;

    const userId = authAccount.userId;

    // Find profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .first();

    // Delete all user data (same tables as dataRetention)
    for (const [table, index] of USER_DATA_TABLES) {
      await deleteByUserIdIndex(ctx, userId, table, index);
    }

    // Delete file metadata + storage
    const fileMeta = await ctx.db
      .query("fileMetadata")
      .withIndex("by_uploadedBy", (q) => q.eq("uploadedBy", userId))
      .collect();
    for (const fm of fileMeta) {
      try {
        await ctx.storage.delete(fm.storageId);
      } catch {}
      await ctx.db.delete(fm._id);
    }

    // Delete auth session/refresh tokens
    const sessions = await ctx.db
      .query("authSessions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const s of sessions) {
      // Delete refresh tokens for this session
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .filter((q) => q.eq(q.field("sessionId"), s._id))
        .collect();
      for (const t of tokens) await ctx.db.delete(t._id);
      await ctx.db.delete(s._id);
    }

    // Delete profile, auth account, and user
    if (profile) await ctx.db.delete(profile._id);
    await ctx.db.delete(authAccount._id);
    await ctx.db.delete(userId);

    return `Deleted user ${email} and all associated data`;
  },
});

/** Light delete: remove user + authAccount + profile without scanning sessions (avoids 32K limit). */
export const deleteUserLight = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const authAccount = await ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(q.eq(q.field("provider"), "password"), q.eq(q.field("providerAccountId"), email)),
      )
      .first();
    if (!authAccount) return `No user found with email ${email}`;

    const userId = authAccount.userId;

    // Delete profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .first();
    if (profile) await ctx.db.delete(profile._id);

    // Delete indexed user data only (skip session table scans)
    for (const [table, index] of USER_DATA_TABLES) {
      await deleteByUserIdIndex(ctx, userId, table, index);
    }

    // Delete auth account + user record
    await ctx.db.delete(authAccount._id);
    await ctx.db.delete(userId);

    return `Deleted user ${email} (light mode — sessions will expire)`;
  },
});

/** List all user emails in the system. Used by seedFreshUsers to wipe everything. */
export const listAllUserEmails = internalQuery({
  args: {},
  handler: async (ctx): Promise<string[]> => {
    const accounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("provider"), "password"))
      .collect();
    return accounts.map((a) => a.providerAccountId);
  },
});

/** Update a profile's status and optionally clear plan dates (for onboarding flow). */
export const setProfileStatus = internalMutation({
  args: {
    userId: v.string(),
    status: v.string(),
    clearPlanDates: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, status, clearPlanDates }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new Error(`No profile found for userId: ${userId}`);

    const patch: Record<string, unknown> = {
      status,
      updatedAt: Date.now(),
    };
    if (clearPlanDates) {
      patch.planStartDate = undefined;
      patch.planEndDate = undefined;
      patch.planTier = undefined;
    }
    await ctx.db.patch(profile._id, patch);
    return `Profile ${userId} updated to status=${status}`;
  },
});

/** Check if a knowledge entry with the given title already exists. Used by seedKnowledgeBase. */
export const checkKnowledgeExists = internalQuery({
  args: { title: v.string() },
  handler: async (ctx, { title }): Promise<boolean> => {
    const entry = await ctx.db
      .query("coachKnowledge")
      .filter((q) => q.eq(q.field("title"), title))
      .first();
    return !!entry;
  },
});

export const fixConfigTypes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q: any) => q.eq("key", "check_in_frequency_days"))
      .unique();
    if (config && typeof config.value === "string") {
      await ctx.db.patch(config._id, { value: Number(config.value) || 14 });
      return `Fixed: "${config.value}" → ${Number(config.value) || 14}`;
    }
    return `No fix needed — value is already ${typeof config?.value}: ${config?.value}`;
  },
});

/**
 * Unlock check-in for E2E tests by deleting only check-ins and plans.
 * Also ensures an initial assessment exists so the user stays on dashboard.
 *
 * Run: npx convex run seed:unlockCheckIn '{"email":"client@fitfast.app"}'
 */
export const unlockCheckIn = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const authAccount = await ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(q.eq(q.field("provider"), "password"), q.eq(q.field("providerAccountId"), email)),
      )
      .first();
    if (!authAccount) return `No user found with email ${email}`;

    const userId = authAccount.userId;

    const deleted: string[] = [];
    const checkIns = await deleteByUserIdIndex(ctx, userId, "checkIns", "by_userId");
    if (checkIns) deleted.push(`checkIns: ${checkIns}`);
    const mealPlans = await deleteByUserIdIndex(ctx, userId, "mealPlans", "by_userId");
    if (mealPlans) deleted.push(`mealPlans: ${mealPlans}`);
    const workoutPlans = await deleteByUserIdIndex(ctx, userId, "workoutPlans", "by_userId");
    if (workoutPlans) deleted.push(`workoutPlans: ${workoutPlans}`);

    // Ensure an initial assessment exists so client stays on dashboard
    const existingAssessment = await ctx.db
      .query("initialAssessments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!existingAssessment) {
      await ctx.db.insert("initialAssessments", {
        userId,
        goals: "weight_loss",
        currentWeight: 80,
        height: 175,
        age: 28,
        gender: "male",
        activityLevel: "moderately_active",
        experienceLevel: "intermediate",
        scheduleAvailability: {
          days: ["mon", "wed", "fri"],
          sessionDuration: 60,
          preferredTime: "morning",
        },
      });
      deleted.push("created assessment");
    }

    return `Unlocked check-in for ${email} — ${deleted.join(", ") || "nothing to change"}`;
  },
});

/**
 * Reset a client's data (plans, assessment, check-ins, completions, tickets)
 * but keep the auth account + profile intact so they can log in and get
 * redirected back to onboarding (initial-assessment).
 *
 * Run: npx convex run seed:resetClientData '{"email":"test_client@client.com"}'
 */
export const resetClientData = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    // Find auth account → userId
    const authAccount = await ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(q.eq(q.field("provider"), "password"), q.eq(q.field("providerAccountId"), email)),
      )
      .first();
    if (!authAccount) return `No user found with email ${email}`;

    const userId = authAccount.userId;

    const counts: Record<string, number> = {};
    for (const [table, index] of USER_DATA_TABLES) {
      counts[table] = await deleteByUserIdIndex(ctx, userId, table, index);
    }

    // Delete file metadata + storage (progress photos, ticket screenshots)
    const fileMeta = await ctx.db
      .query("fileMetadata")
      .withIndex("by_uploadedBy", (q) => q.eq("uploadedBy", userId))
      .collect();
    for (const fm of fileMeta) {
      try {
        await ctx.storage.delete(fm.storageId);
      } catch {}
      await ctx.db.delete(fm._id);
    }
    counts.files = fileMeta.length;

    const summary = Object.entries(counts)
      .filter(([, n]) => n > 0)
      .map(([t, n]) => `${t}: ${n}`)
      .join(", ");

    // Also fix planEndDate to match planTier
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (profile?.planTier && profile.planStartDate) {
      const planMonths = profile.planTier === "quarterly" ? 3 : 1;
      const start = new Date(profile.planStartDate);
      const end = new Date(start);
      end.setMonth(end.getMonth() + planMonths);
      await ctx.db.patch(profile._id, {
        planEndDate: end.toISOString().split("T")[0],
        updatedAt: Date.now(),
      });
    }

    return `Reset ${email} — deleted: ${summary || "nothing to delete"}. Profile kept as active — user will see onboarding on next login.`;
  },
});

/**
 * One-off: patch tags onto existing knowledge base documents.
 * Run: npx convex run seed:patchKnowledgeTags
 */
export const patchKnowledgeTags = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tagMap: Record<string, string[]> = {
      "Nutrition Science Fundamentals": ["nutrition"],
      "Egyptian & MENA Food Database": ["nutrition"],
      "Exercise Selection Guide": ["workout"],
      "Injury Modification Protocol": ["workout", "recovery"],
      "Progressive Overload Guidelines": ["workout"],
      "Recovery & Lifestyle": ["recovery"],
    };

    const results: string[] = [];
    for (const [title, tags] of Object.entries(tagMap)) {
      const entry = await ctx.db
        .query("coachKnowledge")
        .filter((q) => q.eq(q.field("title"), title))
        .first();
      if (!entry) {
        results.push(`NOT FOUND: "${title}"`);
        continue;
      }
      await ctx.db.patch(entry._id, { tags });
      results.push(`PATCHED: "${title}" → [${tags.join(", ")}]`);
    }
    return results.join("\n");
  },
});

/**
 * Debug: list all auth accounts + profiles.
 * Run: npx convex run seed:listAccounts
 */
export const listAccounts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("authAccounts").collect();
    const profiles = await ctx.db.query("profiles").collect();
    return {
      accounts: accounts.map((a) => ({
        provider: a.provider,
        email: a.providerAccountId,
        userId: a.userId,
      })),
      profiles: profiles.map((p) => ({
        userId: p.userId,
        fullName: p.fullName,
        email: p.email,
        isCoach: p.isCoach,
        status: p.status,
      })),
    };
  },
});

// ============================================================================
// Demo user population (previously seedDemo.ts)
// ============================================================================

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
          {
            name: "Breakfast",
            time: "7:00 AM",
            foods: ["3 eggs + toast + fruit"],
            calories: 450,
            protein: 25,
            carbs: 45,
            fat: 18,
          },
          {
            name: "Lunch",
            time: "12:00 PM",
            foods: ["Grilled chicken + rice + salad"],
            calories: 650,
            protein: 45,
            carbs: 60,
            fat: 18,
          },
          {
            name: "Snack",
            time: "3:30 PM",
            foods: ["Greek yogurt + nuts + honey"],
            calories: 300,
            protein: 20,
            carbs: 25,
            fat: 14,
          },
          {
            name: "Dinner",
            time: "7:00 PM",
            foods: ["Fish + sweet potato + vegetables"],
            calories: 550,
            protein: 40,
            carbs: 50,
            fat: 15,
          },
          {
            name: "Post-workout",
            time: "9:00 PM",
            foods: ["Protein shake + banana"],
            calories: 250,
            protein: 30,
            carbs: 35,
            fat: 3,
          },
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
        reflection:
          d === 3
            ? "Great workout today!"
            : d === 2
              ? "Rest day, ate clean."
              : "Solid upper body session.",
      });
    }

    // Ticket
    await ctx.db.insert("tickets", {
      userId,
      subject: "Question about protein timing",
      category: "meal_issue",
      status: "closed",
      messages: [
        {
          sender: "client",
          message: "Should I have protein shake before or after workout?",
          timestamp: now - 7 * 86400000,
        },
        {
          sender: "coach",
          message: "Within 2 hours post-workout is ideal. Pre-workout is optional.",
          timestamp: now - 6.5 * 86400000,
        },
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
