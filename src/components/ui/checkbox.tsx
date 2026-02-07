"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, checked, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked);
      props.onChange?.(e);
    };

    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          {...props}
        />
        <div
          className={cn(
            "h-6 w-6 border-4 border-black bg-[#FFFEF5] transition-all",
            "peer-checked:border-black peer-checked:bg-[#00FF94]",
            "peer-focus-visible:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-[#FF3B00]",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            "cursor-pointer flex items-center justify-center",
            className
          )}
        >
          {checked && (
            <Check
              className="h-4 w-4 text-black"
              strokeWidth={4}
            />
          )}
        </div>
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
