"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Clock, CheckCircle2, Mail } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@fitfast/ui/card";
import { cn } from "@fitfast/ui/cn";

export default function PendingPage() {
  const t = useTranslations("onboarding.pending");
  const router = useRouter();
  const { profile } = useAuth();

  // Real-time auto-redirect — Convex subscription updates profile reactively
  useEffect(() => {
    if (!profile) return;

    if (profile.status === "active") {
      router.replace("/initial-assessment");
    } else if (
      profile.status === "inactive" ||
      profile.status === "expired"
    ) {
      router.replace("/login?error=rejected");
    }
  }, [profile, router]);

  const steps = [
    {
      icon: CheckCircle2,
      title: t("stepSignupComplete"),
      description: t("stepSignupCompleteDesc"),
      complete: true,
    },
    {
      icon: Clock,
      title: t("stepUnderReview"),
      description: t("stepUnderReviewDesc"),
      complete: false,
      active: true,
    },
    {
      icon: Mail,
      title: t("stepApprovalNotification"),
      description: t("stepApprovalNotificationDesc"),
      complete: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center py-6">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
          <Clock className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {/* Progress Steps */}
      <Card>
        <div className="divide-y divide-border">
          {steps.map((step, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-4 p-5",
                step.complete && "bg-success-500/5",
                step.active && "bg-primary/5",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  step.complete
                    ? "bg-success-500 text-white"
                    : step.active
                      ? "bg-primary text-white"
                      : "bg-neutral-100 text-muted-foreground",
                )}
              >
                <step.icon className="h-5 w-5" />
              </div>
              <div>
                <p
                  className={cn(
                    "font-semibold",
                    !step.complete && !step.active && "text-muted-foreground",
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Info Box */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Info</p>
          <p className="text-sm font-medium">{t("message")}</p>
        </CardContent>
      </Card>

      {/* Current Status */}
      {profile && (
        <Card>
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">
                {t("currentStatus")}
              </p>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                {profile.status.replace("_", " ")}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval time notice */}
      <div className="text-center p-6 rounded-xl bg-neutral-50 border border-border">
        <p className="text-xs text-muted-foreground">
          {t("approvalTime")}
        </p>
      </div>
    </div>
  );
}
