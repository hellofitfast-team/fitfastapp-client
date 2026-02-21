"use client";

import { useTranslations, useLocale } from "next-intl";
import { Lock, Calendar } from "lucide-react";

interface CheckInLockedProps {
  nextCheckInDate: Date;
  daysUntilNextCheckIn: number;
}

export function CheckInLocked({ nextCheckInDate, daysUntilNextCheckIn }: CheckInLockedProps) {
  const t = useTranslations("checkIn");
  const locale = useLocale();

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-border bg-primary/5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Lock className="h-4 w-4 text-primary" />
        </div>
        <h2 className="font-semibold text-sm">
          {t("checkInLocked", { default: "Check-In Locked" })}
        </h2>
      </div>
      <div className="p-8 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-5">
          <Calendar className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-bold text-lg">
          {t("nextCheckInAvailable", { default: "Next Check-In Available" })}
        </h3>
        <p className="mt-3 text-4xl font-bold text-primary">
          {daysUntilNextCheckIn} {t("days", { default: "days" })}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {nextCheckInDate.toLocaleDateString(locale === "ar" ? "ar-u-nu-latn" : "en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <div className="mt-6 p-4 rounded-lg border border-dashed border-border bg-neutral-50">
          <p className="text-sm text-muted-foreground">
            {t("lockReason", { default: "Check-ins are scheduled every 14 days to ensure optimal progress tracking and AI plan generation. Use this time to follow your current meal and workout plans." })}
          </p>
        </div>
      </div>
    </div>
  );
}
