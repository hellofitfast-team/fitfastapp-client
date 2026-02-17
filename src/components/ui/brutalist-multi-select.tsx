"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BrutalistMultiSelectProps {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  otherValue: string;
  onOtherChange: (value: string) => void;
  disabled?: boolean;
  columns?: number;
  hasNoneOption?: boolean;
}

export function BrutalistMultiSelect({
  options,
  selected,
  onChange,
  otherValue,
  onOtherChange,
  disabled,
  columns = 2,
  hasNoneOption = false,
}: BrutalistMultiSelectProps) {
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
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: "8px" }}>
        {allOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => toggle(option.id)}
            disabled={disabled || (hasNoneOption && selected.includes("none") && option.id !== "none")}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3.5 text-start text-sm font-medium transition-all",
              selected.includes(option.id)
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-card text-foreground hover:bg-neutral-50",
              (disabled || (hasNoneOption && selected.includes("none") && option.id !== "none"))
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer active:scale-[0.97]"
            )}
          >
            <div
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                selected.includes(option.id)
                  ? "border-primary bg-primary"
                  : "border-input bg-card"
              )}
            >
              {selected.includes(option.id) && (
                <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
              )}
            </div>
            <span>{option.label}</span>
          </button>
        ))}
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
