import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full border-4 border-black bg-cream px-4 py-3 text-sm text-black font-mono placeholder:text-neutral-400 focus:outline-none focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors",
          error && "border-error-500",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
