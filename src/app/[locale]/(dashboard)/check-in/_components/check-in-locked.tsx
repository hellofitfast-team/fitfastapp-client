"use client";

import { useTranslations } from "next-intl";
import { Lock, Calendar } from "lucide-react";

interface CheckInLockedProps {
  nextCheckInDate: Date;
  daysUntilNextCheckIn: number;
}

export function CheckInLocked({ nextCheckInDate, daysUntilNextCheckIn }: CheckInLockedProps) {
  const t = useTranslations("checkIn");

  return (
    <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="border-b-4 border-black bg-primary p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center bg-black">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <h2 className="font-black text-xl text-white tracking-tight">
          {t("checkInLocked", { default: "CHECK-IN LOCKED" }).toUpperCase()}
        </h2>
      </div>
      <div className="p-12 text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center bg-primary mb-6">
          <Calendar className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-2xl font-black tracking-tight">
          {t("nextCheckInAvailable", { default: "NEXT CHECK-IN AVAILABLE" }).toUpperCase()}
        </h3>
        <p className="mt-4 text-5xl font-black text-primary">
          {daysUntilNextCheckIn} {t("days", { default: "DAYS" }).toUpperCase()}
        </p>
        <p className="mt-4 font-mono text-sm text-neutral-500">
          {nextCheckInDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }).toUpperCase()}
        </p>
        <div className="mt-8 p-6 border-4 border-dashed border-black bg-neutral-50">
          <p className="font-bold text-base">
            {t("lockReason", { default: "Check-ins are scheduled every 14 days to ensure optimal progress tracking and AI plan generation. Use this time to follow your current meal and workout plans." }).toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
}
