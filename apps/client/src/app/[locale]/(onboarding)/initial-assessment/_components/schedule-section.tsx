"use client";

import { Calendar } from "lucide-react";
import { SectionCard } from "@fitfast/ui/section-card";
import { cn } from "@fitfast/ui/cn";
import { DAYS } from "./constants";

interface ScheduleSectionProps {
  selectedDays: string[];
  setSelectedDays: (days: string[]) => void;
  isLoading: boolean;
}

export function ScheduleSection({
  selectedDays,
  setSelectedDays,
  isLoading,
}: ScheduleSectionProps) {
  return (
    <SectionCard icon={Calendar} title="Weekly Schedule" description="Select your workout days" variant="routine">
      <div className="space-y-2">
        <div className="flex gap-1.5">
          {DAYS.map((day) => (
            <button
              key={day.id}
              type="button"
              onClick={() => {
                if (selectedDays.includes(day.id)) {
                  setSelectedDays(selectedDays.filter((d) => d !== day.id));
                } else {
                  setSelectedDays([...selectedDays, day.id]);
                }
              }}
              disabled={isLoading}
              className={cn(
                "flex-1 h-12 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors",
                selectedDays.includes(day.id)
                  ? "bg-[#8B5CF6] text-white"
                  : "bg-neutral-100 text-muted-foreground hover:bg-neutral-200",
                isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-[0.97]"
              )}
            >
              {day.label}
            </button>
          ))}
        </div>
        <div className="flex justify-between px-1 text-[10px] text-muted-foreground">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>
      </div>
    </SectionCard>
  );
}
