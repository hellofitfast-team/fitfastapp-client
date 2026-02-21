"use client";

import { Check } from "lucide-react";
import { cn } from "./cn";

const FEATURE_SELECT_STYLES = {
  primary: {
    selected: "border-[#4169E1]/30 bg-[#4169E1]/8 text-[#4169E1]",
    check: "text-[#4169E1]",
  },
  nutrition: {
    selected: "border-[#10B981]/30 bg-[#10B981]/8 text-[#10B981]",
    check: "text-[#10B981]",
  },
  fitness: {
    selected: "border-[#F97316]/30 bg-[#F97316]/8 text-[#F97316]",
    check: "text-[#F97316]",
  },
  streak: {
    selected: "border-[#F59E0B]/30 bg-[#F59E0B]/8 text-[#F59E0B]",
    check: "text-[#F59E0B]",
  },
  routine: {
    selected: "border-[#8B5CF6]/30 bg-[#8B5CF6]/8 text-[#8B5CF6]",
    check: "text-[#8B5CF6]",
  },
} as const;

export type MultiSelectColor = keyof typeof FEATURE_SELECT_STYLES;

export interface MultiSelectProps {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  otherValue: string;
  onOtherChange: (value: string) => void;
  disabled?: boolean;
  columns?: number;
  hasNoneOption?: boolean;
  featureColor?: MultiSelectColor;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  otherValue,
  onOtherChange,
  disabled,
  hasNoneOption = false,
  featureColor = "primary",
}: MultiSelectProps) {
  const styles = FEATURE_SELECT_STYLES[featureColor];

  const toggle = (id: string) => {
    if (id === "none") {
      onChange(selected.includes("none") ? [] : ["none"]);
      onOtherChange("");
    } else if (id === "other") {
      const newSelected = selected.filter((s) => s !== "none");
      if (newSelected.includes("other")) {
        onChange(newSelected.filter((s) => s !== "other"));
        onOtherChange("");
      } else {
        onChange([...newSelected, "other"]);
      }
    } else {
      const newSelected = selected.filter((s) => s !== "none");
      if (newSelected.includes(id)) {
        onChange(newSelected.filter((s) => s !== id));
      } else {
        onChange([...newSelected, id]);
      }
    }
  };

  const allOptions = [...options, { id: "other", label: "Other" }];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {allOptions.map((option) => {
          const isSelected = selected.includes(option.id);
          const isDisabledByNone = hasNoneOption && selected.includes("none") && option.id !== "none";
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggle(option.id)}
              disabled={disabled || isDisabledByNone}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all whitespace-nowrap",
                isSelected
                  ? styles.selected
                  : "border-border bg-card text-foreground hover:bg-neutral-50",
                (disabled || isDisabledByNone)
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer active:scale-[0.97]"
              )}
            >
              {isSelected && (
                <Check className={cn("h-3.5 w-3.5", styles.check)} strokeWidth={3} />
              )}
              {option.label}
            </button>
          );
        })}
      </div>
      {selected.includes("other") && (
        <input
          type="text"
          placeholder="Please specify..."
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          disabled={disabled}
          className="w-full h-11 px-3 rounded-lg border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-colors"
        />
      )}
    </div>
  );
}

// Backwards-compatible alias
export { MultiSelect as BrutalistMultiSelect };
export type { MultiSelectProps as BrutalistMultiSelectProps };
