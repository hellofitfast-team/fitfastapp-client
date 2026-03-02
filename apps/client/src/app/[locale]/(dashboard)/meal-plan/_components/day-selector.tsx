"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@fitfast/ui/cn";
import { toLocalDigits } from "@/lib/utils";

interface DaySelectorProps {
  totalDays: number;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  planStartDate?: string;
  restDays?: number[];
  featureColor?: "nutrition" | "fitness";
}

const ACTIVE_STYLES = {
  nutrition: "bg-primary text-white shadow-md",
  fitness: "bg-primary text-white shadow-md",
} as const;

export function DaySelector({
  totalDays,
  selectedDay,
  onSelectDay,
  planStartDate,
  restDays = [],
  featureColor = "nutrition",
}: DaySelectorProps) {
  const locale = useLocale();
  const t = useTranslations("meals");
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll selected day into view on mount
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", behavior: "smooth" });
  }, [selectedDay]);

  const getWeekdayLabel = (dayIndex: number): string => {
    if (!planStartDate) return "";
    try {
      const date = new Date(planStartDate);
      date.setDate(date.getDate() + dayIndex);
      return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
        weekday: "short",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
      {Array.from({ length: totalDays }, (_, i) => {
        const isActive = selectedDay === i;
        const isRest = restDays.includes(i);
        const weekday = getWeekdayLabel(i);

        return (
          <button
            key={i}
            ref={isActive ? activeRef : undefined}
            onClick={() => onSelectDay(i)}
            className={cn(
              "min-w-[48px] flex-shrink-0 rounded-xl px-3 py-2.5 text-center text-xs font-semibold transition-colors",
              isActive
                ? ACTIVE_STYLES[featureColor]
                : isRest
                  ? "bg-neutral-100 text-neutral-400"
                  : "text-muted-foreground bg-neutral-100 hover:bg-neutral-200",
            )}
          >
            <div>{t("dayLabel", { n: toLocalDigits(i + 1, locale) })}</div>
            {weekday && <div className="mt-0.5 text-[10px] opacity-80">{weekday}</div>}
          </button>
        );
      })}
    </div>
  );
}
