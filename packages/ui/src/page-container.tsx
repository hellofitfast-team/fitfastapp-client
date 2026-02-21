import * as React from "react";
import { cn } from "./cn";

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

const maxWidthMap = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
} as const;

export function PageContainer({
  children,
  className,
  maxWidth = "md",
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "px-4 py-6 space-y-5 mx-auto lg:px-6",
        maxWidthMap[maxWidth],
        className
      )}
    >
      {children}
    </div>
  );
}
