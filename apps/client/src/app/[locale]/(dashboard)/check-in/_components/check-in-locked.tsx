"use client";

import { useTranslations, useLocale } from "next-intl";
import { Lock, Calendar } from "lucide-react";
import { toLocalDigits } from "@/lib/utils";

interface CheckInLockedProps {
  nextCheckInDate: Date;
  daysUntilNextCheckIn: number;
  frequencyDays?: number;
}

export function CheckInLocked({
  nextCheckInDate,
  daysUntilNextCheckIn,
  frequencyDays = 14,
}: CheckInLockedProps) {
  const t = useTranslations("checkIn");
  const locale = useLocale();

  return (
    <div className="border-border bg-card shadow-card overflow-hidden rounded-xl border">
      <div className="border-border bg-primary/5 flex items-center gap-3 border-b p-4">
        <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
          <Lock className="text-primary h-4 w-4" />
        </div>
        <h2 className="text-sm font-semibold">
          {t("checkInLocked", { default: "Check-In Locked" })}
        </h2>
      </div>
      <div className="p-8 text-center">
        <div className="bg-primary/10 mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full">
          <Calendar className="text-primary h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold">
          {t("nextCheckInAvailable", { default: "Next Check-In Available" })}
        </h3>
        <p className="text-primary mt-3 text-4xl font-bold">
          {toLocalDigits(daysUntilNextCheckIn, locale)} {t("days", { default: "days" })}
        </p>
        <p className="text-muted-foreground mt-3 text-sm">
          {nextCheckInDate.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <div className="border-border mt-6 rounded-lg border border-dashed bg-neutral-50 p-4">
          <p className="text-muted-foreground text-sm">
            {t("lockReason", { days: frequencyDays })}
          </p>
        </div>
      </div>
    </div>
  );
}
