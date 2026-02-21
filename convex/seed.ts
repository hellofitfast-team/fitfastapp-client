import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

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
      value: { "3_months": 2500, "6_months": 4000, "12_months": 7000 },
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
 * Promote a user to coach by Clerk user ID.
 * Run: npx convex run seed:makeCoach '{"userId":"user_xxx"}'
 */
export const makeCoach = internalMutation({
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
      isCoach: true,
      status: "active",
      fullName: profile.fullName || "Coach",
      updatedAt: Date.now(),
    });

    return `${userId} is now a coach.`;
  },
});

/**
 * Activate a client account by Clerk user ID.
 * Run: npx convex run seed:activateClient '{"userId":"user_xxx"}'
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
      planTier: "3_months",
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
        value: { "3_months": 2500, "6_months": 4000, "12_months": 7000 },
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
