"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// ---------------------------------------------------------------------------
// Email sending helper
// ---------------------------------------------------------------------------

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "FitFast <noreply@fitfast.app>";
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Bilingual email templates
// ---------------------------------------------------------------------------

function getWelcomeEmail(fullName: string, language: "en" | "ar") {
  const isAr = language === "ar";
  return {
    subject: isAr ? "مرحبًا بك في فيت فاست! 🎉" : "Welcome to FitFast! 🎉",
    html: `
      <div dir="${isAr ? "rtl" : "ltr"}" style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h1 style="color:#10B981">${isAr ? `أهلاً ${fullName}!` : `Hey ${fullName}!`}</h1>
        <p>${isAr
          ? "تمت الموافقة على حسابك. يمكنك الآن تسجيل الدخول وبدء رحلتك في اللياقة البدنية."
          : "Your account has been approved. You can now sign in and start your fitness journey."
        }</p>
        <p>${isAr
          ? "أكمل التقييم الأولي للحصول على خطة وجباتك وتمارينك المخصصة."
          : "Complete your initial assessment to get your personalized meal and workout plans."
        }</p>
        <p style="color:#6b7280;font-size:12px;margin-top:32px">— FitFast</p>
      </div>`,
  };
}

function getPlanReadyEmail(fullName: string, language: "en" | "ar") {
  const isAr = language === "ar";
  return {
    subject: isAr ? "خططك الجديدة جاهزة! 💪" : "Your new plans are ready! 💪",
    html: `
      <div dir="${isAr ? "rtl" : "ltr"}" style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h1 style="color:#10B981">${isAr ? `${fullName}، خططك جاهزة!` : `${fullName}, your plans are ready!`}</h1>
        <p>${isAr
          ? "تم إنشاء خطة الوجبات وخطة التمارين الجديدة بنجاح بناءً على آخر تسجيل متابعة."
          : "Your new meal plan and workout plan have been generated based on your latest check-in."
        }</p>
        <p>${isAr
          ? "افتح التطبيق لعرض خططك المحدثة."
          : "Open the app to view your updated plans."
        }</p>
        <p style="color:#6b7280;font-size:12px;margin-top:32px">— FitFast</p>
      </div>`,
  };
}

function getTicketReplyEmail(fullName: string, ticketSubject: string, coachMessage: string, language: "en" | "ar") {
  const isAr = language === "ar";
  return {
    subject: isAr ? `رد المدرب: ${ticketSubject}` : `Coach replied: ${ticketSubject}`,
    html: `
      <div dir="${isAr ? "rtl" : "ltr"}" style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h1 style="color:#10B981">${isAr ? `${fullName}، رد مدربك` : `${fullName}, your coach replied`}</h1>
        <p style="font-weight:600">${isAr ? "الموضوع:" : "Subject:"} ${ticketSubject}</p>
        <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0">${coachMessage}</p>
        </div>
        <p>${isAr
          ? "افتح التطبيق للرد أو عرض المحادثة الكاملة."
          : "Open the app to reply or view the full conversation."
        }</p>
        <p style="color:#6b7280;font-size:12px;margin-top:32px">— FitFast</p>
      </div>`,
  };
}

function getReminderEmail(fullName: string, language: "en" | "ar") {
  const isAr = language === "ar";
  return {
    subject: isAr ? "حان وقت المتابعة! 📊" : "Time for your check-in! 📊",
    html: `
      <div dir="${isAr ? "rtl" : "ltr"}" style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h1 style="color:#10B981">${isAr ? `${fullName}، حان وقت المتابعة` : `${fullName}, it's check-in time`}</h1>
        <p>${isAr
          ? "سجّل تقدمك اليوم حتى يتمكن مدربك من تحديث خططك."
          : "Track your progress today so your coach can update your plans."
        }</p>
        <p style="color:#6b7280;font-size:12px;margin-top:32px">— FitFast</p>
      </div>`,
  };
}

function getRejectionEmail(fullName: string, rejectionReason: string, language: "en" | "ar") {
  const isAr = language === "ar";
  return {
    subject: isAr
      ? "تحديث على طلبك في فيت فاست"
      : "Your FitFast Application Update",
    html: `
      <div dir="${isAr ? "rtl" : "ltr"}" style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h1 style="color:#374151">${isAr ? `${fullName}، شكرًا لاهتمامك` : `Hi ${fullName},`}</h1>
        <p>${isAr
          ? "شكرًا لتقديمك للانضمام إلى فيت فاست. بعد مراجعة طلبك، لم نتمكن من الموافقة عليه في هذا الوقت."
          : "Thank you for applying to join FitFast. After reviewing your application, we're unable to approve it at this time."
        }</p>
        ${rejectionReason ? `
        <div style="background:#f9fafb;border-left:4px solid #d1d5db;border-radius:4px;padding:16px;margin:16px 0">
          <p style="margin:0;font-weight:600;color:#374151">${isAr ? "السبب:" : "Reason:"}</p>
          <p style="margin:8px 0 0;color:#6b7280">${rejectionReason}</p>
        </div>
        ` : ""}
        <p>${isAr
          ? "يمكنك إعادة التقديم في المستقبل. إذا كان لديك أي أسئلة، يُرجى التواصل معنا."
          : "You're welcome to reapply in the future. If you have any questions, please reach out."
        }</p>
        <p style="color:#6b7280;font-size:12px;margin-top:32px">— FitFast</p>
      </div>`,
  };
}

// ---------------------------------------------------------------------------
// Internal actions — called from workflows and other actions
// ---------------------------------------------------------------------------

export const sendWelcomeEmail = internalAction({
  args: {
    email: v.string(),
    fullName: v.string(),
    language: v.union(v.literal("en"), v.literal("ar")),
  },
  handler: async (_ctx, { email, fullName, language }): Promise<void> => {
    const { subject, html } = getWelcomeEmail(fullName, language);
    await sendEmail(email, subject, html);
  },
});

export const sendPlanReadyEmail = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<void> => {
    // Skip email if user has active push subscription
    const subscription = await ctx.runQuery(
      internal.pushSubscriptions.getSubscriptionByUserId,
      { userId },
    );
    if (subscription?.isActive) return;

    const profile = await ctx.runQuery(internal.helpers.getProfileInternal, { userId });
    if (!profile?.email) return;

    const { subject, html } = getPlanReadyEmail(
      profile.fullName ?? "there",
      profile.language,
    );
    await sendEmail(profile.email, subject, html);
  },
});

export const sendTicketReplyEmail = internalAction({
  args: {
    ticketId: v.id("tickets"),
    coachMessage: v.string(),
  },
  handler: async (ctx, { ticketId, coachMessage }): Promise<void> => {
    const ticket = await ctx.runQuery(internal.helpers.getTicketInternal, { ticketId });
    if (!ticket) return;

    const profile = await ctx.runQuery(internal.helpers.getProfileInternal, {
      userId: ticket.userId,
    });
    if (!profile?.email) return;

    const { subject, html } = getTicketReplyEmail(
      profile.fullName ?? "there",
      ticket.subject,
      coachMessage,
      profile.language,
    );
    await sendEmail(profile.email, subject, html);
  },
});

export const sendReminderEmail = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<void> => {
    // Skip email if user has active push subscription
    const subscription = await ctx.runQuery(
      internal.pushSubscriptions.getSubscriptionByUserId,
      { userId },
    );
    if (subscription?.isActive) return;

    const profile = await ctx.runQuery(internal.helpers.getProfileInternal, { userId });
    if (!profile?.email) return;

    const { subject, html } = getReminderEmail(
      profile.fullName ?? "there",
      profile.language,
    );
    await sendEmail(profile.email, subject, html);
  },
});

export const sendRejectionEmail = internalAction({
  args: {
    email: v.string(),
    fullName: v.string(),
    rejectionReason: v.string(),
    language: v.union(v.literal("en"), v.literal("ar")),
  },
  handler: async (_ctx, { email, fullName, rejectionReason, language }): Promise<void> => {
    const { subject, html } = getRejectionEmail(fullName, rejectionReason, language);
    await sendEmail(email, subject, html);
  },
});
