"use client";

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
    <div className="border-4 border-black">
      <div className="border-b-4 border-black bg-primary p-4">
        <h2 className="font-black text-xl text-white">WEEKLY SCHEDULE</h2>
        <p className="font-mono text-xs text-white/80 mt-1">SELECT YOUR WORKOUT DAYS</p>
      </div>
      <div className="p-4 bg-cream">
        <div className="flex gap-0">
          {DAYS.map((day, index) => (
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
              className={`flex-1 h-16 flex items-center justify-center border-4 border-black font-black text-lg transition-colors -ml-1 first:ml-0 ${
                selectedDays.includes(day.id)
                  ? "bg-black text-primary"
                  : "bg-cream text-black hover:bg-neutral-100"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {day.label}
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-2 px-1 font-mono text-[10px] text-neutral-400">
          <span>MON</span>
          <span>TUE</span>
          <span>WED</span>
          <span>THU</span>
          <span>FRI</span>
          <span>SAT</span>
          <span>SUN</span>
        </div>
      </div>
    </div>
  );
}
