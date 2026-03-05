"use client";

import { cn } from "./cn";

export interface RatingSelectorProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  label?: string;
  disabled?: boolean;
  labels?: { low: string; mid: string; high: string };
}

function getZoneLabel(value: number, labels?: { low: string; mid: string; high: string }) {
  if (value <= 3) return labels?.low ?? "Needs work";
  if (value <= 7) return labels?.mid ?? "Moderate";
  return labels?.high ?? "Great";
}

export function RatingSelector({
  value,
  onChange,
  max = 10,
  label,
  disabled,
  labels,
}: RatingSelectorProps) {
  return (
    <div>
      {label && (
        <div className="mb-2.5 flex items-center justify-between">
          <label className="text-sm font-medium">{label}</label>
          <span
            className="rounded-full px-2 py-0.5 text-sm font-bold"
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
              color: "var(--color-primary)",
            }}
          >
            {value}/{max} · {getZoneLabel(value, labels)}
          </span>
        </div>
      )}
      <div className="flex gap-1.5">
        {Array.from({ length: max }, (_, i) => i + 1).map((num) => {
          const isSelected = value === num;
          return (
            <button
              key={num}
              type="button"
              onClick={() => onChange(num)}
              disabled={disabled}
              className={cn(
                "flex h-11 flex-1 items-center justify-center rounded-lg text-xs font-semibold transition-all",
                isSelected && "scale-110",
                disabled && "cursor-not-allowed opacity-50",
              )}
              style={
                isSelected
                  ? {
                      backgroundColor: "var(--color-primary)",
                      color: "#fff",
                      boxShadow:
                        "0 0 0 1px var(--color-background), 0 0 0 3px color-mix(in srgb, var(--color-primary) 30%, transparent)",
                    }
                  : {
                      backgroundColor: "#f5f5f5",
                      color: "#737373",
                    }
              }
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}
