"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WidgetCardProps {
  icon?: LucideIcon;
  title: string;
  value?: string | number;
  subtitle?: string;
  trend?: { direction: "up" | "down" | "neutral"; label: string };
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function WidgetCard({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
  children,
  className,
  onClick,
}: WidgetCardProps) {
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      onClick={onClick}
      className={cn(
        "rounded-xl border border-border bg-card p-4 text-start shadow-card transition-all",
        onClick && "cursor-pointer hover:shadow-md active:scale-[0.98]",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">
            {title}
          </p>
          {value !== undefined && (
            <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
          )}
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                trend.direction === "up" && "text-success-600",
                trend.direction === "down" && "text-error-500",
                trend.direction === "neutral" && "text-muted-foreground"
              )}
            >
              {trend.direction === "up" && "\u2191 "}
              {trend.direction === "down" && "\u2193 "}
              {trend.label}
            </p>
          )}
        </div>
        {Icon && (
          <div className="ms-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4.5 w-4.5 text-primary" />
          </div>
        )}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </Comp>
  );
}
