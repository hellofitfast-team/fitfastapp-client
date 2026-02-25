import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

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
    await ctx.db.insert("systemConfig", {
      key: "plan_pricing",
      value: { monthly: 800, quarterly: 2000 },
      updatedAt: now,
    });
    await ctx.db.insert("systemConfig", {
      key: "coach_instapay_account",
      value: { name: "FitFast Coach", number: "01234567890" },
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
      { q: "How often do I submit check-ins?", a: "Check-ins are submitted every 14 days (2 weeks). Your coach will review your progress and adjust your plans accordingly." },
      { q: "Can I change my meal plan?", a: "Your meal plan is AI-generated based on your goals and preferences. A new plan is created after each check-in. You can always contact your coach for adjustments." },
      { q: "What if I miss a workout?", a: "No worries! Just continue with your next scheduled workout. Consistency over perfection. If you need to adjust your schedule, let your coach know." },
      { q: "How do I track my progress?", a: "Use the Tracking page daily to mark meals and workouts as complete. Submit check-ins every 2 weeks with your weight and progress photos." },
      { q: "How do I contact my coach?", a: "Use the Tickets page to send a message to your coach. They'll respond as soon as possible." },
      { q: "What payment methods are accepted?", a: "We accept InstaPay transfers. Upload your payment screenshot during signup and your coach will verify it." },
      { q: "How do I change the app language?", a: "Tap the language switcher (AR/EN) in the top-right corner of any page to switch between English and Arabic." },
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
      { q: "كم مرة أقدم تقرير متابعة؟", a: "يتم تقديم تقارير المتابعة كل 14 يوم (أسبوعين). سيراجع مدربك تقدمك ويعدل خططك وفقاً لذلك." },
      { q: "هل يمكنني تغيير خطة الوجبات؟", a: "خطة الوجبات يتم إنشاؤها بالذكاء الاصطناعي بناءً على أهدافك وتفضيلاتك. يتم إنشاء خطة جديدة بعد كل تقرير متابعة." },
      { q: "ماذا لو فاتني تمرين؟", a: "لا تقلق! فقط استمر في التمرين المجدول التالي. الاستمرارية أهم من الكمال." },
      { q: "كيف أتتبع تقدمي؟", a: "استخدم صفحة التتبع يومياً لتحديد الوجبات والتمارين المكتملة. قدم تقارير المتابعة كل أسبوعين." },
      { q: "كيف أتواصل مع مدربي؟", a: "استخدم صفحة التذاكر لإرسال رسالة إلى مدربك. سيرد في أقرب وقت ممكن." },
      { q: "ما هي طرق الدفع المقبولة؟", a: "نقبل تحويلات InstaPay. ارفع لقطة شاشة الدفع أثناء التسجيل وسيتحقق منها مدربك." },
      { q: "كيف أغير لغة التطبيق؟", a: "اضغط على زر تبديل اللغة (AR/EN) في الزاوية العلوية اليمنى لأي صفحة." },
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

    await ctx.db.patch(profile._id, {
      status: "active",
      planTier: "quarterly",
      planStartDate: new Date().toISOString().split("T")[0],
      planEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      updatedAt: Date.now(),
    });

    return `${userId} is now active with 3-month plan.`;
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
      await ctx.db.insert("systemConfig", {
        key: "plan_pricing",
        value: { monthly: 800, quarterly: 2000 },
        updatedAt: now,
      });
      await ctx.db.insert("systemConfig", {
        key: "coach_instapay_account",
        value: { name: "FitFast Coach", number: "01234567890" },
        updatedAt: now,
      });
    }

    // Seed FAQs
    const existingFaq = await ctx.db.query("faqs").first();
    if (!existingFaq) {
      const enFaqs = [
        { q: "How often do I submit check-ins?", a: "Check-ins are submitted every 14 days. Your coach will review your progress and adjust your plans." },
        { q: "Can I change my meal plan?", a: "Your meal plan is AI-generated based on your goals. A new plan is created after each check-in." },
        { q: "What if I miss a workout?", a: "No worries! Just continue with your next scheduled workout. Consistency over perfection." },
        { q: "How do I track my progress?", a: "Use the Tracking page daily to mark meals and workouts complete. Submit check-ins every 2 weeks." },
        { q: "How do I contact my coach?", a: "Use the Tickets page to send a message to your coach." },
        { q: "What payment methods are accepted?", a: "We accept InstaPay transfers. Upload your payment screenshot during signup." },
        { q: "How do I change the app language?", a: "Tap the language switcher (AR/EN) in the top-right corner of any page." },
      ];
      for (let i = 0; i < enFaqs.length; i++) {
        await ctx.db.insert("faqs", { question: enFaqs[i].q, answer: enFaqs[i].a, language: "en", displayOrder: i, updatedAt: now });
      }

      const arFaqs = [
        { q: "كم مرة أقدم تقرير متابعة؟", a: "يتم تقديم تقارير المتابعة كل 14 يوم. سيراجع مدربك تقدمك ويعدل خططك." },
        { q: "هل يمكنني تغيير خطة الوجبات؟", a: "خطة الوجبات يتم إنشاؤها بالذكاء الاصطناعي بناءً على أهدافك وتفضيلاتك." },
        { q: "ماذا لو فاتني تمرين؟", a: "لا تقلق! فقط استمر في التمرين المجدول التالي." },
        { q: "كيف أتتبع تقدمي؟", a: "استخدم صفحة التتبع يومياً لتحديد الوجبات والتمارين المكتملة." },
        { q: "كيف أتواصل مع مدربي؟", a: "استخدم صفحة التذاكر لإرسال رسالة إلى مدربك." },
        { q: "ما هي طرق الدفع المقبولة؟", a: "نقبل تحويلات InstaPay. ارفع لقطة شاشة الدفع أثناء التسجيل." },
        { q: "كيف أغير لغة التطبيق؟", a: "اضغط على زر تبديل اللغة (AR/EN) في الزاوية العلوية." },
      ];
      for (let i = 0; i < arFaqs.length; i++) {
        await ctx.db.insert("faqs", { question: arFaqs[i].q, answer: arFaqs[i].a, language: "ar", displayOrder: i, updatedAt: now });
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
        q.and(
          q.eq(q.field("provider"), "password"),
          q.eq(q.field("providerAccountId"), email),
        ),
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
      planTier: isCoach ? undefined : ("quarterly" as const),
      planStartDate: isCoach
        ? undefined
        : new Date().toISOString().split("T")[0],
      planEndDate: isCoach
        ? undefined
        : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
      updatedAt: Date.now(),
    });

    return `Created ${isCoach ? "coach" : "client"}: ${email} (userId: ${userId})`;
  },
});

/** Full cascade-delete a user by email: auth tables + profile + all data. */
export const deleteUserByEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    // Find auth account
    const authAccount = await ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(
          q.eq(q.field("provider"), "password"),
          q.eq(q.field("providerAccountId"), email),
        ),
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
    async function deleteByIndex(table: string, indexName: string) {
      const docs = await (ctx.db as any)
        .query(table)
        .withIndex(indexName, (q: any) => q.eq("userId", userId))
        .collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }

    await deleteByIndex("dailyReflections", "by_userId_date");
    await deleteByIndex("mealCompletions", "by_userId_date");
    await deleteByIndex("workoutCompletions", "by_userId_date");
    await deleteByIndex("mealPlans", "by_userId");
    await deleteByIndex("workoutPlans", "by_userId");
    await deleteByIndex("checkIns", "by_userId");
    await deleteByIndex("initialAssessments", "by_userId");
    await deleteByIndex("assessmentHistory", "by_userId");
    await deleteByIndex("tickets", "by_userId");
    await deleteByIndex("pushSubscriptions", "by_userId");

    // Delete file metadata + storage
    const fileMeta = await ctx.db
      .query("fileMetadata")
      .withIndex("by_uploadedBy", (q) => q.eq("uploadedBy", userId))
      .collect();
    for (const fm of fileMeta) {
      try { await ctx.storage.delete(fm.storageId); } catch {}
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
        q.and(
          q.eq(q.field("provider"), "password"),
          q.eq(q.field("providerAccountId"), email),
        ),
      )
      .first();
    if (!authAccount) return `No user found with email ${email}`;

    const userId = authAccount.userId;

    // Helper: delete all docs in a table matching userId via index
    async function deleteByIndex(table: string, indexName: string) {
      const docs = await (ctx.db as any)
        .query(table)
        .withIndex(indexName, (q: any) => q.eq("userId", userId))
        .collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
      return docs.length;
    }

    const counts: Record<string, number> = {};
    counts.mealPlans = await deleteByIndex("mealPlans", "by_userId");
    counts.workoutPlans = await deleteByIndex("workoutPlans", "by_userId");
    counts.checkIns = await deleteByIndex("checkIns", "by_userId");
    counts.initialAssessments = await deleteByIndex("initialAssessments", "by_userId");
    counts.assessmentHistory = await deleteByIndex("assessmentHistory", "by_userId");
    counts.mealCompletions = await deleteByIndex("mealCompletions", "by_userId_date");
    counts.workoutCompletions = await deleteByIndex("workoutCompletions", "by_userId_date");
    counts.dailyReflections = await deleteByIndex("dailyReflections", "by_userId_date");
    counts.tickets = await deleteByIndex("tickets", "by_userId");

    // Delete file metadata + storage (progress photos, ticket screenshots)
    const fileMeta = await ctx.db
      .query("fileMetadata")
      .withIndex("by_uploadedBy", (q) => q.eq("uploadedBy", userId))
      .collect();
    for (const fm of fileMeta) {
      try { await ctx.storage.delete(fm.storageId); } catch {}
      await ctx.db.delete(fm._id);
    }
    counts.files = fileMeta.length;

    const summary = Object.entries(counts)
      .filter(([, n]) => n > 0)
      .map(([t, n]) => `${t}: ${n}`)
      .join(", ");

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
