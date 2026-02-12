import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full border-4 border-black bg-cream px-4 text-sm text-black font-mono file:border-0 file:bg-transparent file:text-sm file:font-bold file:text-black placeholder:text-neutral-400 focus:outline-none focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          error && "border-error-500",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
