"use client";

import { cn } from "./cn";

export interface RatingSelectorProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  label?: string;
  disabled?: boolean;
}

function getZoneColor(num: number, isSelected: boolean) {
  if (!isSelected) return "bg-neutral-100 text-muted-foreground";
  if (num <= 4) return "bg-error-500 text-white";
  if (num <= 7) return "bg-warning-500 text-white";
  return "bg-success-500 text-white";
}

function getZoneLabel(value: number) {
  if (value <= 4) return "Needs work";
  if (value <= 7) return "Moderate";
  return "Great";
}

export function RatingSelector({
  value,
  onChange,
  max = 10,
  label,
  disabled,
}: RatingSelectorProps) {
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-sm font-medium">{label}</label>
          <span
            className={cn(
              "text-sm font-bold px-2 py-0.5 rounded-full",
              value <= 4
                ? "bg-error-500/10 text-error-500"
                : value <= 7
                  ? "bg-warning-500/10 text-warning-600"
                  : "bg-success-500/10 text-success-600"
            )}
          >
            {value}/{max} · {getZoneLabel(value)}
          </span>
        </div>
      )}
      <div className="flex gap-1.5">
        {Array.from({ length: max }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            disabled={disabled}
            className={cn(
              "flex-1 h-10 rounded-lg text-xs font-semibold transition-all flex items-center justify-center",
              getZoneColor(num, value >= num),
              value === num && "scale-110 ring-2 ring-offset-1 ring-offset-background",
              value === num && num <= 4 && "ring-error-500/30",
              value === num && num > 4 && num <= 7 && "ring-warning-500/30",
              value === num && num > 7 && "ring-success-500/30",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
}
