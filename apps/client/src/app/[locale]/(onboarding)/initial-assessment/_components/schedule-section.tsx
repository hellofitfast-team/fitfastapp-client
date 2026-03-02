"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Calendar, Clock, Sun, Info } from "lucide-react";
import { SectionCard } from "@fitfast/ui/section-card";
import { cn } from "@fitfast/ui/cn";
import { DAYS, SESSION_DURATIONS, TRAINING_TIMES, getDayLimits } from "./constants";

interface ScheduleSectionProps {
  selectedDays: string[];
  setSelectedDays: (days: string[]) => void;
  sessionDuration: string;
  setSessionDuration: (duration: string) => void;
  trainingTime: string;
  setTrainingTime: (time: string) => void;
  primaryGoal: string;
  experienceLevel: string;
  isLoading: boolean;
}

export function ScheduleSection({
  selectedDays,
  setSelectedDays,
  sessionDuration,
  setSessionDuration,
  trainingTime,
  setTrainingTime,
  primaryGoal,
  experienceLevel,
  isLoading,
}: ScheduleSectionProps) {
  const t = useTranslations("onboarding.assessment");
  const limits = getDayLimits(primaryGoal, experienceLevel);

  React.useEffect(() => {
    if (selectedDays.length > limits.max) {
      setSelectedDays(selectedDays.slice(0, limits.max));
    }
  }, [limits.max, selectedDays, setSelectedDays]);

  const handleToggleDay = (dayId: string) => {
    if (selectedDays.includes(dayId)) {
      setSelectedDays(selectedDays.filter((d) => d !== dayId));
    } else if (selectedDays.length < limits.max) {
      setSelectedDays([...selectedDays, dayId]);
    }
  };

  const atMax = selectedDays.length >= limits.max;
  const belowMin = selectedDays.length < limits.min;

  return (
    <div className="space-y-6">
      {/* Day selection */}
      <SectionCard
        icon={Calendar}
        title={t("scheduleTitle")}
        description={t("scheduleDesc")}
        variant="routine"
      >
        <div className="space-y-3">
          {/* Recommendation hint */}
          <div className="bg-primary/5 border-primary/10 flex items-start gap-2 rounded-lg border px-3 py-2.5">
            <Info className="text-primary mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs text-stone-600">
              {t("scheduleHint", {
                min: limits.min,
                max: limits.max,
                recommended: limits.recommended,
              })}
            </p>
          </div>

          {/* Day circles */}
          <div className="flex gap-1.5">
            {DAYS.map((day) => {
              const isSelected = selectedDays.includes(day.id);
              const isDisabled = isLoading || (!isSelected && atMax);
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => handleToggleDay(day.id)}
                  disabled={isDisabled}
                  className={cn(
                    "flex h-12 flex-1 items-center justify-center rounded-lg text-sm font-semibold transition-all",
                    isSelected
                      ? "bg-primary text-white"
                      : isDisabled
                        ? "cursor-not-allowed bg-neutral-50 text-stone-300"
                        : "text-muted-foreground cursor-pointer bg-neutral-100 hover:bg-neutral-200 active:scale-[0.97]",
                  )}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
          <div className="text-muted-foreground flex justify-between px-1 text-[10px]">
            {DAYS.map((day) => (
              <span key={day.id}>{t(`days.${day.id}`)}</span>
            ))}
          </div>

          {/* Counter */}
          <p
            className={cn(
              "text-center text-xs font-medium",
              belowMin && selectedDays.length > 0
                ? "text-amber-600"
                : atMax
                  ? "text-stone-400"
                  : "text-stone-500",
            )}
          >
            {t("daysSelected", { count: selectedDays.length, min: limits.min, max: limits.max })}
          </p>
        </div>
      </SectionCard>

      {/* Session duration */}
      <SectionCard
        icon={Clock}
        title={t("sessionDurationTitle")}
        description={t("sessionDurationDesc")}
        variant="routine"
      >
        <div className="grid grid-cols-4 gap-2">
          {SESSION_DURATIONS.map((option) => {
            const isSelected = sessionDuration === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSessionDuration(option.id)}
                disabled={isLoading}
                className={cn(
                  "flex items-center justify-center rounded-xl border-2 px-3 py-3 text-xs font-semibold tracking-wide uppercase transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-stone-200 text-stone-500 hover:border-stone-300",
                )}
              >
                {t(`sessionDurations.${option.id}`)}
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* Preferred training time — optional */}
      <SectionCard
        icon={Sun}
        title={t("trainingTimeTitle")}
        description={t("trainingTimeDesc")}
        variant="routine"
      >
        <div className="grid grid-cols-2 gap-2">
          {TRAINING_TIMES.map((option) => {
            const isSelected = trainingTime === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTrainingTime(isSelected ? "" : option.id)}
                disabled={isLoading}
                className={cn(
                  "flex items-center justify-center rounded-xl border-2 px-3 py-3 text-xs font-semibold tracking-wide uppercase transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-stone-200 text-stone-500 hover:border-stone-300",
                )}
              >
                {t(`trainingTimes.${option.id}`)}
              </button>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
