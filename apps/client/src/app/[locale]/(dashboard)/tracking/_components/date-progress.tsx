"use client";

import { useTranslations } from "next-intl";
import { Calendar, CheckCircle2 } from "lucide-react";

interface DateProgressProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  completionPercentage: number;
}

export function DateProgress({
  selectedDate,
  onDateChange,
  completionPercentage,
}: DateProgressProps) {
  const t = useTranslations("tracking");

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {/* Date Picker */}
      <div className="border-border bg-card shadow-card overflow-hidden rounded-xl border">
        <div className="border-border flex items-center gap-2 border-b bg-neutral-50 p-3.5">
          <Calendar className="text-routine h-4 w-4" />
          <span className="text-sm font-medium">{t("selectDate")}</span>
        </div>
        <div className="p-3.5">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="border-input bg-card focus:ring-ring h-11 w-full rounded-lg border px-3.5 text-sm transition-colors focus:ring-2 focus:outline-none"
          />
        </div>
      </div>

      {/* Completion Progress */}
      <div className="border-border bg-primary shadow-card overflow-hidden rounded-xl border">
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="text-xs text-white/70">{t("todaysProgress")}</p>
            <p className="mt-1 text-4xl font-bold text-white">{completionPercentage}%</p>
          </div>
          <div className="relative h-20 w-20">
            <svg className="h-20 w-20 -rotate-90 transform">
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke="white"
                strokeWidth="6"
                fill="transparent"
                className="opacity-20"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke="white"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - completionPercentage / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
