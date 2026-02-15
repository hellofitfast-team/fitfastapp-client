"use client";

import { Check } from "lucide-react";

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

  const allOptions = [...options, { id: "other", label: "OTHER" }];

  return (
    <div className="space-y-3">
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: "0" }}>
        {allOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => toggle(option.id)}
            disabled={disabled || (hasNoneOption && selected.includes("none") && option.id !== "none")}
            className={`flex items-center gap-3 border-2 border-black p-4 text-start text-sm font-bold transition-colors -mt-0.5 -ms-0.5 first:mt-0 first:ms-0 ${
              selected.includes(option.id)
                ? "bg-black text-primary"
                : "bg-cream text-black hover:bg-neutral-100"
            } ${disabled || (hasNoneOption && selected.includes("none") && option.id !== "none") ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center border-2 border-black ${
                selected.includes(option.id)
                  ? "bg-primary"
                  : "bg-white"
              }`}
            >
              {selected.includes(option.id) && (
                <Check className="h-4 w-4 text-black" strokeWidth={3} />
              )}
            </div>
            <span className="tracking-wide">{option.label}</span>
          </button>
        ))}
      </div>
      {selected.includes("other") && (
        <input
          type="text"
          placeholder="PLEASE SPECIFY..."
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          disabled={disabled}
          className="w-full h-12 px-4 border-4 border-black bg-cream font-mono text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:bg-white transition-colors"
        />
      )}
    </div>
  );
}
