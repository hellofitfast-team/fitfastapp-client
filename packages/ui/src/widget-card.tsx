"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";

const FEATURE_ICON_STYLES = {
  primary: {
    bg: "bg-[#4169E1]",
    shadow: "shadow-[0_4px_16px_rgba(65,105,225,0.15)]",
  },
  nutrition: {
    bg: "bg-[#10B981]",
    shadow: "shadow-[0_4px_16px_rgba(16,185,129,0.15)]",
  },
  fitness: {
    bg: "bg-[#F97316]",
    shadow: "shadow-[0_4px_16px_rgba(249,115,22,0.15)]",
  },
  streak: {
    bg: "bg-[#F59E0B]",
    shadow: "shadow-[0_4px_16px_rgba(245,158,11,0.15)]",
  },
  routine: {
    bg: "bg-[#8B5CF6]",
    shadow: "shadow-[0_4px_16px_rgba(139,92,246,0.15)]",
  },
} as const;

export type WidgetFeatureColor = keyof typeof FEATURE_ICON_STYLES;

export interface WidgetCardProps {
  icon?: LucideIcon;
  title: string;
  value?: string | number;
  subtitle?: string;
  trend?: { direction: "up" | "down" | "neutral"; label: string };
  featureColor?: WidgetFeatureColor;
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
  featureColor = "primary",
  children,
  className,
  onClick,
}: WidgetCardProps) {
  const Comp = onClick ? "button" : "div";
  const iconStyles = FEATURE_ICON_STYLES[featureColor];

  return (
    <Comp
      onClick={onClick}
      className={cn(
        "rounded-xl border border-border bg-card p-4 text-start shadow-card transition-all",
        onClick && "cursor-pointer hover:shadow-lifted active:scale-[0.98]",
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
          <div
            className={cn(
              "ms-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              iconStyles.bg,
              iconStyles.shadow
            )}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
        )}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </Comp>
  );
}
