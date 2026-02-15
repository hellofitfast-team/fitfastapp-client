"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { User, Bell, Shield, CreditCard, ChevronDown, LogOut, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be under 100 characters"),
  phone: z.string().regex(/^[\d+\-\s()]*$/, "Invalid phone number format").optional().or(z.literal("")),
  language: z.enum(["en", "ar"]),
});
type ProfileFormData = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const t = useTranslations("settings");
  const locale = useLocale();
  const { profile, signOut, user, refetch } = useAuth();
  const { isSupported, isSubscribed, permission, toggleSubscription, loading: notifLoading, error: notifError } = useNotifications();

  // React Hook Form for profile settings
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      fullName: profile?.full_name || "",
      phone: profile?.phone || "",
      language: (profile?.language || "en") as "en" | "ar",
    },
  });

  // Other state (not in form)
  const [reminderTime, setReminderTime] = useState("08:00");
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when profile loads
  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.full_name || "",
        phone: profile.phone || "",
        language: (profile.language || "en") as "en" | "ar",
      });
    }
  }, [profile, reset]);

  // Fetch persisted reminder time on mount
  useEffect(() => {
    fetch("/api/notifications/reminder-time")
      .then((res) => res.json())
      .then((data) => {
        if (data.reminder_time) setReminderTime(data.reminder_time);
      })
      .catch(() => {});
  }, []);

  // Form submit handler
  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    setIsSaving(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ full_name: data.fullName, phone: data.phone, language: data.language } as never)
      .eq("id", user.id);
    refetch();
    setIsSaving(false);
  };

  // Calculate plan details from profile data
  const calculatePlanDetails = () => {
    if (!profile?.plan_start_date || !profile?.plan_end_date) {
      return { daysRemaining: 0, progressPercentage: 0, formattedEndDate: "N/A" };
    }

    const today = new Date();
    const endDate = new Date(profile.plan_end_date);
    const startDate = new Date(profile.plan_start_date);

    // Calculate days remaining
    const diffTime = endDate.getTime() - today.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Calculate total days in plan
    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate progress percentage (how much time has passed)
    const daysPassed = totalDays - daysRemaining;
    const progressPercentage = totalDays > 0 ? Math.min(100, Math.max(0, (daysPassed / totalDays) * 100)) : 0;

    // Format end date (e.g., "JANUARY 15, 2027")
    const formattedEndDate = endDate.toLocaleDateString(locale === "ar" ? "ar-u-nu-latn" : "en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).toUpperCase();

    return { daysRemaining, progressPercentage, formattedEndDate };
  };

  const { daysRemaining, progressPercentage, formattedEndDate } = calculatePlanDetails();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="border-4 border-black bg-black p-6">
        <h1 className="text-3xl font-black text-cream tracking-tight">
          {t("title").toUpperCase()}
        </h1>
        <p className="mt-2 font-mono text-xs tracking-[0.2em] text-primary">
          {t("subtitle").toUpperCase()}
        </p>
      </div>

      {/* Profile Settings */}
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-primary p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-black">
            <User className="h-5 w-5 text-cream" />
          </div>
          <h2 className="font-black text-xl text-white tracking-tight">
            {t("profile").toUpperCase()}
          </h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block font-bold text-xs uppercase tracking-wide mb-2">
              {t("fullName")}
            </label>
            <input
              type="text"
              placeholder="John Doe"
              {...register("fullName")}
              className={cn(
                "w-full h-12 px-4 border-4 bg-cream font-mono text-sm placeholder:text-neutral-400 focus:outline-none focus:bg-white transition-colors",
                errors.fullName ? "border-error-500" : "border-black"
              )}
              aria-invalid={errors.fullName ? "true" : "false"}
            />
            {errors.fullName && (
              <p className="mt-1 font-mono text-xs text-error-500" role="alert">
                {errors.fullName.message}
              </p>
            )}
          </div>
          <div>
            <label className="block font-bold text-xs uppercase tracking-wide mb-2">
              {t("phone")}
            </label>
            <input
              type="tel"
              placeholder="01xxxxxxxxx"
              {...register("phone")}
              className={cn(
                "w-full h-12 px-4 border-4 bg-cream font-mono text-sm placeholder:text-neutral-400 focus:outline-none focus:bg-white transition-colors",
                errors.phone ? "border-error-500" : "border-black"
              )}
              aria-invalid={errors.phone ? "true" : "false"}
            />
            {errors.phone && (
              <p className="mt-1 font-mono text-xs text-error-500" role="alert">
                {errors.phone.message}
              </p>
            )}
          </div>
          <div>
            <label className="block font-bold text-xs uppercase tracking-wide mb-2">
              {t("language")}
            </label>
            <div className="relative">
              <select
                {...register("language")}
                className="w-full h-12 px-4 pe-10 border-4 border-black bg-cream font-bold text-sm uppercase appearance-none cursor-pointer focus:outline-none focus:bg-white transition-colors"
              >
                <option value="en">ENGLISH</option>
                <option value="ar">العربية</option>
              </select>
              <ChevronDown className="absolute end-4 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none" />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="w-full h-12 bg-black text-white font-black text-sm uppercase tracking-wide hover:bg-primary transition-colors disabled:opacity-50"
          >
            {isSaving ? "SAVING..." : t("saveChanges").toUpperCase()}
          </button>
        </form>
      </div>

      {/* Notifications */}
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-black p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-primary">
            <Bell className="h-5 w-5 text-black" />
          </div>
          <h2 className="font-black text-xl text-cream tracking-tight">
            {t("notifications").toUpperCase()}
          </h2>
        </div>
        <div className="p-6 space-y-6">
          {notifError ? (
            <div className="border-4 border-black bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-amber-500">
                  <AlertTriangle className="h-5 w-5 text-black" strokeWidth={3} />
                </div>
                <div className="space-y-1">
                  <p className="font-black text-sm uppercase text-amber-900">
                    {t("notificationsUnavailableTitle")}
                  </p>
                  <p className="font-mono text-xs text-amber-700">
                    {t("notificationsUnavailableDescription")}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black uppercase">{t("enableNotifications")}</p>
                  <p className="font-mono text-xs text-neutral-500 mt-1">
                    {isSupported
                      ? permission === "denied"
                        ? t("notificationsDenied").toUpperCase()
                        : t("notificationsDescription").toUpperCase()
                      : t("notificationsUnsupported").toUpperCase()}
                  </p>
                </div>
                {notifLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <button
                    onClick={() => toggleSubscription()}
                    disabled={!isSupported || (permission === "denied" && !isSubscribed)}
                    className={`relative h-8 w-16 border-4 border-black transition-colors ${
                      isSubscribed ? "bg-primary" : "bg-neutral-200"
                    } ${(!isSupported || permission === "denied") ? "opacity-50 cursor-not-allowed" : ""}`}
                    role="switch"
                    aria-checked={isSubscribed}
                  >
                    <span
                      className={`absolute top-0 h-full w-1/2 bg-black transition-transform ${
                        isSubscribed ? "translate-x-full" : "translate-x-0"
                      }`}
                    />
                  </button>
                )}
              </div>
              <div>
                <label className="block font-bold text-xs uppercase tracking-wide mb-2">
                  {t("reminderTime")}
                </label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => {
                    const newTime = e.target.value;
                    setReminderTime(newTime);
                    fetch("/api/notifications/reminder-time", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ reminder_time: newTime }),
                    }).catch(() => {});
                  }}
                  className="h-12 px-4 border-4 border-black bg-cream font-mono text-sm focus:outline-none focus:bg-white transition-colors"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Account */}
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-black p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-primary">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <h2 className="font-black text-xl text-cream tracking-tight">
            {t("account").toUpperCase()}
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <button className="w-full h-12 border-4 border-black bg-cream font-black text-sm uppercase tracking-wide hover:bg-black hover:text-cream transition-colors">
            {t("changePassword").toUpperCase()}
          </button>
          <button
            onClick={() => signOut()}
            className="w-full h-12 border-4 border-error-500 bg-error-500/10 font-black text-sm uppercase tracking-wide text-error-500 hover:bg-error-500 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            {t("signOut").toUpperCase()}
          </button>
        </div>
      </div>

      {/* Plan Details */}
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-primary p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-black">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <h2 className="font-black text-xl text-black tracking-tight">
            {t("planDetails").toUpperCase()}
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b-2 border-black/10 pb-3">
              <span className="font-mono text-xs uppercase tracking-wide text-neutral-500">
                {t("planTier")}
              </span>
              <span className="font-black uppercase">
                {profile?.plan_tier ? `${profile.plan_tier} ${t("months").toUpperCase()}` : `6 ${t("months").toUpperCase()}`}
              </span>
            </div>
            <div className="flex justify-between items-center border-b-2 border-black/10 pb-3">
              <span className="font-mono text-xs uppercase tracking-wide text-neutral-500">
                {t("planExpiry")}
              </span>
              <span className="font-black uppercase">
                {formattedEndDate}
              </span>
            </div>
            <div className="flex justify-between items-center border-b-2 border-black/10 pb-3">
              <span className="font-mono text-xs uppercase tracking-wide text-neutral-500">
                {t("status").toUpperCase()}
              </span>
              <span className="inline-flex items-center border-4 border-primary bg-primary/10 px-3 py-1 font-black text-xs uppercase text-black">
                {profile?.status?.toUpperCase() || t("active").toUpperCase()}
              </span>
            </div>
            <div className="border-4 border-black bg-neutral-100 p-4 mt-4">
              <p className="font-mono text-xs uppercase tracking-wide text-neutral-500 mb-2">
                {t("daysRemaining")}
              </p>
              <p className="text-4xl font-black">{daysRemaining}</p>
              <div className="mt-3 h-4 border-2 border-black bg-cream" dir={locale === "ar" ? "rtl" : "ltr"}>
                <div
                  className="h-full bg-primary"
                  style={{ width: `${progressPercentage.toFixed(1)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
