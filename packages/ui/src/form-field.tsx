import * as React from "react";
import { cn } from "./cn";

export interface FormFieldProps {
  label: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  error,
  optional,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-sm font-medium">
        {label}
        {optional && (
          <span className="text-muted-foreground font-normal ms-1">
            (optional)
          </span>
        )}
      </label>
      {children}
      {error && (
        <p className="text-xs text-error-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
