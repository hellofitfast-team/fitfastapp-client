"use client";

import { useTranslations } from "next-intl";
import { Calendar, CheckCircle2 } from "lucide-react";

interface DateProgressProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  completionPercentage: number;
}

export function DateProgress({ selectedDate, onDateChange, completionPercentage }: DateProgressProps) {
  const t = useTranslations("tracking");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Date Picker */}
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-neutral-100 p-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span className="font-bold text-xs uppercase">{t("selectDate").toUpperCase()}</span>
        </div>
        <div className="p-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="w-full h-12 px-4 border-4 border-black bg-cream font-mono text-sm focus:outline-none focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Completion Progress */}
      <div className="border-4 border-black bg-primary shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="p-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs tracking-[0.2em] text-white/80">{t("todaysProgress").toUpperCase()}</p>
            <p className="text-5xl font-black text-white mt-2">{completionPercentage}%</p>
          </div>
          <div className="relative h-24 w-24">
            <svg className="h-24 w-24 -rotate-90 transform">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="black"
                strokeWidth="8"
                fill="transparent"
                className="opacity-30"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="white"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - completionPercentage / 100)}`}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
