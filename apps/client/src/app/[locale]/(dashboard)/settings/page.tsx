"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { User, Bell, Shield, CreditCard, LogOut, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@fitfast/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@fitfast/ui/cn";

const profileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be under 100 characters"),
  phone: z.string().regex(/^[\d+\-\s()]*$/, "Invalid phone number format").optional().or(z.literal("")),
  language: z.enum(["en", "ar"]),
});
type ProfileFormData = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const t = useTranslations("settings");
  const locale = useLocale();
  const { profile, signOut } = useAuth();
  const { isSupported, isSubscribed, permission, toggleSubscription, loading: notifLoading, error: notifError } = useNotifications();
  const updateProfile = useMutation(api.profiles.updateProfile);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      fullName: profile?.fullName || "",
      phone: profile?.phone || "",
      language: (profile?.language || "en") as "en" | "ar",
    },
  });

  const [reminderTime, setReminderTime] = useState("08:00");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName || "",
        phone: profile.phone || "",
        language: (profile.language || "en") as "en" | "ar",
      });
      if (profile.notificationReminderTime) {
        setReminderTime(profile.notificationReminderTime);
      }
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsSaving(true);
    try {
      await updateProfile({
        fullName: data.fullName,
        phone: data.phone || undefined,
        language: data.language,
      });
    } catch (err) {
      console.error("Failed to update profile:", err);
    }
    setIsSaving(false);
  };

  const handleReminderTimeChange = async (newTime: string) => {
    setReminderTime(newTime);
    try {
      await updateProfile({ notificationReminderTime: newTime });
    } catch {
      // silently fail
    }
  };

  const calculatePlanDetails = () => {
    if (!profile?.planStartDate || !profile?.planEndDate) {
      return { daysRemaining: 0, progressPercentage: 0, formattedEndDate: "N/A" };
    }
    const today = new Date();
    const endDate = new Date(profile.planEndDate);
    const startDate = new Date(profile.planStartDate);
    const diffTime = endDate.getTime() - today.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysPassed = totalDays - daysRemaining;
    const progressPercentage = totalDays > 0 ? Math.min(100, Math.max(0, (daysPassed / totalDays) * 100)) : 0;
    const formattedEndDate = endDate.toLocaleDateString(locale === "ar" ? "ar-u-nu-latn" : "en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
    return { daysRemaining, progressPercentage, formattedEndDate };
  };

  const { daysRemaining, progressPercentage, formattedEndDate } = calculatePlanDetails();

  return (
    <div className="px-4 py-6 space-y-5 max-w-2xl mx-auto lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {/* Profile Settings */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <User className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">{t("profile")}</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">{t("fullName")}</label>
            <input
              type="text"
              placeholder="John Doe"
              {...register("fullName")}
              className={cn(
                "w-full h-11 px-3.5 rounded-lg border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors",
                errors.fullName ? "border-error-500" : "border-input"
              )}
              aria-invalid={errors.fullName ? "true" : "false"}
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-error-500" role="alert">{errors.fullName.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">{t("phone")}</label>
            <input
              type="tel"
              placeholder="01xxxxxxxxx"
              {...register("phone")}
              className={cn(
                "w-full h-11 px-3.5 rounded-lg border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors",
                errors.phone ? "border-error-500" : "border-input"
              )}
              aria-invalid={errors.phone ? "true" : "false"}
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-error-500" role="alert">{errors.phone.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">{t("language")}</label>
            <select
              {...register("language")}
              className="w-full h-11 px-3.5 rounded-lg border border-input bg-card text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all active:scale-[0.97] disabled:opacity-50"
          >
            {isSaving ? (locale === "ar" ? "جارٍ الحفظ..." : "Saving...") : t("saveChanges")}
          </button>
        </form>
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">{t("notifications")}</h2>
        </div>
        <div className="p-4 space-y-5">
          {notifError ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">{t("notificationsUnavailableTitle")}</p>
                  <p className="text-xs text-amber-700 mt-0.5">{t("notificationsUnavailableDescription")}</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{t("enableNotifications")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isSupported
                      ? permission === "denied"
                        ? t("notificationsDenied")
                        : t("notificationsDescription")
                      : t("notificationsUnsupported")}
                  </p>
                </div>
                {notifLoading ? (
                  <Skeleton className="h-7 w-12 rounded-full" />
                ) : (
                  <button
                    onClick={() => toggleSubscription()}
                    disabled={!isSupported || (permission === "denied" && !isSubscribed)}
                    className={cn(
                      "relative h-7 w-12 rounded-full transition-colors",
                      isSubscribed ? "bg-primary" : "bg-neutral-200",
                      (!isSupported || permission === "denied") && "opacity-50 cursor-not-allowed"
                    )}
                    role="switch"
                    aria-checked={isSubscribed}
                  >
                    <span className={cn(
                      "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform",
                      isSubscribed ? "translate-x-5" : "translate-x-0.5"
                    )} />
                  </button>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("reminderTime")}</label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => handleReminderTimeChange(e.target.value)}
                  className="h-11 px-3.5 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Account */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">{t("account")}</h2>
        </div>
        <div className="p-4 space-y-3">
          <button className="w-full py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-neutral-50 transition-colors">
            {t("changePassword")}
          </button>
          <button
            onClick={() => signOut()}
            className="w-full py-2.5 rounded-lg border border-error-500/30 bg-error-500/5 text-sm font-medium text-error-500 hover:bg-error-500/10 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            {t("signOut")}
          </button>
        </div>
      </div>

      {/* Plan Details */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-border bg-primary/5">
          <CreditCard className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">{t("planDetails")}</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-xs text-muted-foreground">{t("planTier")}</span>
            <span className="text-sm font-semibold">
              {profile?.planTier ? `${profile.planTier} ${t("months")}` : `6 ${t("months")}`}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-xs text-muted-foreground">{t("planExpiry")}</span>
            <span className="text-sm font-semibold">{formattedEndDate}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-xs text-muted-foreground">{t("status")}</span>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {profile?.status || t("active")}
            </span>
          </div>
          <div className="rounded-lg bg-neutral-50 border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">{t("daysRemaining")}</p>
            <p className="text-3xl font-bold">{daysRemaining}</p>
            <div className="mt-3 h-2 rounded-full bg-neutral-200 overflow-hidden" dir={locale === "ar" ? "rtl" : "ltr"}>
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progressPercentage.toFixed(1)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
