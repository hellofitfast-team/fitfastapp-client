import * as React from "react";
import { cn } from "@/lib/utils";

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <div
      ref={ref}
      role={decorative ? "none" : "separator"}
      aria-orientation={orientation}
      className={cn(
        "shrink-0 bg-black",
        orientation === "horizontal" ? "h-1 w-full" : "h-full w-1",
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = "Separator";

export { Separator };
