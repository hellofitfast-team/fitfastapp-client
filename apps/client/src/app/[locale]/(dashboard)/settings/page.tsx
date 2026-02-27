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
import { useToast } from "@/hooks/use-toast";

function createProfileSchema(t: (key: string) => string) {
  return z.object({
    fullName: z.string().min(2, t("nameMinLength")).max(100, t("nameMaxLength")),
    phone: z
      .string()
      .regex(/^[\d+\-\s()]*$/, t("invalidPhone"))
      .optional()
      .or(z.literal("")),
    language: z.enum(["en", "ar"]),
  });
}
type ProfileFormData = z.infer<ReturnType<typeof createProfileSchema>>;

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tTracking = useTranslations("tracking");
  const tValidation = useTranslations("validation");
  const profileSchema = createProfileSchema((key) => tValidation(key));
  const locale = useLocale();
  const { profile, signOut } = useAuth();
  const {
    isSupported,
    isSubscribed,
    permission,
    toggleSubscription,
    loading: notifLoading,
    error: notifError,
  } = useNotifications();
  const updateProfile = useMutation(api.profiles.updateProfile);

  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
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
  const [reminderInitialized, setReminderInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize reminder time from profile once (setState during render, guarded by flag)
  if (profile?.notificationReminderTime && !reminderInitialized) {
    setReminderTime(profile.notificationReminderTime);
    setReminderInitialized(true);
  }

  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName || "",
        phone: profile.phone || "",
        language: (profile.language || "en") as "en" | "ar",
      });
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
      console.error("Failed to update profile:", err); // Sentry captures this
      toast({ title: t("errors.saveFailed"), variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handleReminderTimeChange = async (newTime: string) => {
    setReminderTime(newTime);
    try {
      await updateProfile({ notificationReminderTime: newTime });
    } catch {
      toast({ title: t("errors.saveFailed"), variant: "destructive" });
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
    const progressPercentage =
      totalDays > 0 ? Math.min(100, Math.max(0, (daysPassed / totalDays) * 100)) : 0;
    const formattedEndDate = endDate.toLocaleDateString(
      locale === "ar" ? "ar-u-nu-latn" : "en-US",
      {
        month: "long",
        day: "numeric",
        year: "numeric",
      },
    );
    return { daysRemaining, progressPercentage, formattedEndDate };
  };

  const { daysRemaining, progressPercentage, formattedEndDate } = calculatePlanDetails();

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </div>

      {/* Profile Settings */}
      <div
        className="border-border bg-card shadow-card animate-slide-up overflow-hidden rounded-xl border"
        style={{ animationDelay: "0ms" }}
      >
        <div className="border-border flex items-center gap-2 border-b bg-neutral-50/50 p-4">
          <User className="text-primary h-4 w-4" />
          <h3 className="text-sm font-semibold">{t("profile")}</h3>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("email")}</label>
            <input
              type="email"
              value={profile?.email || ""}
              readOnly
              className="border-input text-muted-foreground h-11 w-full cursor-not-allowed rounded-lg border bg-neutral-50 px-3.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("fullName")}</label>
            <input
              type="text"
              placeholder="John Doe"
              {...register("fullName")}
              className={cn(
                "bg-card placeholder:text-muted-foreground focus:ring-ring h-11 w-full rounded-lg border px-3.5 text-sm transition-colors focus:ring-2 focus:outline-none",
                errors.fullName ? "border-error-500" : "border-input",
              )}
              aria-invalid={errors.fullName ? "true" : "false"}
            />
            {errors.fullName && (
              <p className="text-error-500 mt-1 text-xs" role="alert">
                {errors.fullName.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("phone")}</label>
            <input
              type="tel"
              placeholder="01xxxxxxxxx"
              {...register("phone")}
              className={cn(
                "bg-card placeholder:text-muted-foreground focus:ring-ring h-11 w-full rounded-lg border px-3.5 text-sm transition-colors focus:ring-2 focus:outline-none",
                errors.phone ? "border-error-500" : "border-input",
              )}
              aria-invalid={errors.phone ? "true" : "false"}
            />
            {errors.phone && (
              <p className="text-error-500 mt-1 text-xs" role="alert">
                {errors.phone.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("language")}</label>
            <select
              {...register("language")}
              className="border-input bg-card focus:ring-ring h-11 w-full cursor-pointer appearance-none rounded-lg border px-3.5 text-sm transition-colors focus:ring-2 focus:outline-none"
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-50"
          >
            {isSaving ? tTracking("saving") : t("saveChanges")}
          </button>
        </form>
      </div>

      {/* Notifications */}
      <div
        className="border-border bg-card shadow-card animate-slide-up overflow-hidden rounded-xl border"
        style={{ animationDelay: "50ms" }}
      >
        <div className="border-border flex items-center gap-2 border-b bg-neutral-50/50 p-4">
          <Bell className="text-primary h-4 w-4" />
          <h3 className="text-sm font-semibold">{t("notifications")}</h3>
        </div>
        <div className="space-y-5 p-4">
          {notifError ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    {t("notificationsUnavailableTitle")}
                  </p>
                  <p className="mt-0.5 text-xs text-amber-700">
                    {t("notificationsUnavailableDescription")}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{t("enableNotifications")}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
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
                      (!isSupported || permission === "denied") && "cursor-not-allowed opacity-50",
                    )}
                    role="switch"
                    aria-checked={isSubscribed}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform",
                        isSubscribed ? "translate-x-5" : "translate-x-0.5",
                      )}
                    />
                  </button>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t("reminderTime")}</label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => handleReminderTimeChange(e.target.value)}
                  className="border-input bg-card focus:ring-ring h-11 rounded-lg border px-3.5 text-sm transition-colors focus:ring-2 focus:outline-none"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Account */}
      <div
        className="border-border bg-card shadow-card animate-slide-up overflow-hidden rounded-xl border"
        style={{ animationDelay: "100ms" }}
      >
        <div className="border-border flex items-center gap-2 border-b bg-neutral-50/50 p-4">
          <Shield className="text-primary h-4 w-4" />
          <h3 className="text-sm font-semibold">{t("account")}</h3>
        </div>
        <div className="space-y-3 p-4">
          <button className="border-border w-full rounded-lg border py-2.5 text-sm font-medium transition-colors hover:bg-neutral-50">
            {t("changePassword")}
          </button>
          <button
            onClick={() => signOut()}
            className="border-error-500/30 bg-error-500/5 text-error-500 hover:bg-error-500/10 flex w-full items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {t("signOut")}
          </button>
        </div>
      </div>

      {/* Plan Details */}
      <div
        className="border-border bg-card shadow-card animate-slide-up overflow-hidden rounded-xl border"
        style={{ animationDelay: "150ms" }}
      >
        <div className="border-border flex items-center gap-2 border-b bg-neutral-50/50 p-4">
          <CreditCard className="text-primary h-4 w-4" />
          <h3 className="text-sm font-semibold">{t("planDetails")}</h3>
        </div>
        <div className="space-y-4 p-4">
          {profile?.planTier ? (
            <>
              <div className="border-border flex items-center justify-between border-b py-2">
                <span className="text-muted-foreground text-xs">{t("planTier")}</span>
                <span className="text-sm font-semibold">{t(`planTiers.${profile.planTier}`)}</span>
              </div>
              <div className="border-border flex items-center justify-between border-b py-2">
                <span className="text-muted-foreground text-xs">{t("planStart")}</span>
                <span className="text-sm font-semibold">
                  {profile.planStartDate
                    ? new Date(profile.planStartDate).toLocaleDateString(
                        locale === "ar" ? "ar-u-nu-latn" : "en-US",
                        { month: "long", day: "numeric", year: "numeric" },
                      )
                    : "—"}
                </span>
              </div>
              <div className="border-border flex items-center justify-between border-b py-2">
                <span className="text-muted-foreground text-xs">{t("planExpiry")}</span>
                <span className="text-sm font-semibold">{formattedEndDate}</span>
              </div>
              <div className="border-border flex items-center justify-between border-b py-2">
                <span className="text-muted-foreground text-xs">{t("status")}</span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    profile.status === "active"
                      ? "bg-[#10B981]/10 text-[#10B981]"
                      : profile.status === "expired"
                        ? "bg-error-500/10 text-error-500"
                        : "bg-amber-500/10 text-amber-600",
                  )}
                >
                  {t(`statuses.${profile.status}`)}
                </span>
              </div>
              <div className="border-border rounded-lg border bg-neutral-50 p-4">
                <p className="text-muted-foreground mb-1 text-xs">{t("daysRemaining")}</p>
                <p className="text-3xl font-bold">{daysRemaining}</p>
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200"
                  dir={locale === "ar" ? "rtl" : "ltr"}
                >
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${progressPercentage.toFixed(1)}%` }}
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground py-4 text-center text-sm">{t("noPlan")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
