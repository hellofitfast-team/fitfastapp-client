import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";

const VARIANT_STYLES = {
  primary: {
    headerBg: "bg-[#4169E1]/8",
    iconContainer: "bg-[#4169E1]/12 border-[#4169E1]/20",
    iconColor: "text-[#4169E1]",
  },
  nutrition: {
    headerBg: "bg-[#10B981]/8",
    iconContainer: "bg-[#10B981]/12 border-[#10B981]/20",
    iconColor: "text-[#10B981]",
  },
  fitness: {
    headerBg: "bg-[#F97316]/8",
    iconContainer: "bg-[#F97316]/12 border-[#F97316]/20",
    iconColor: "text-[#F97316]",
  },
  streak: {
    headerBg: "bg-[#F59E0B]/8",
    iconContainer: "bg-[#F59E0B]/12 border-[#F59E0B]/20",
    iconColor: "text-[#F59E0B]",
  },
  routine: {
    headerBg: "bg-[#8B5CF6]/8",
    iconContainer: "bg-[#8B5CF6]/12 border-[#8B5CF6]/20",
    iconColor: "text-[#8B5CF6]",
  },
  neutral: {
    headerBg: "bg-neutral-50",
    iconContainer: "bg-neutral-100 border-neutral-200",
    iconColor: "text-neutral-600",
  },
} as const;

export type SectionCardVariant = keyof typeof VARIANT_STYLES;

export interface SectionCardProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  variant?: SectionCardVariant;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({
  icon: Icon,
  title,
  description,
  variant = "primary",
  headerAction,
  children,
  className,
}: SectionCardProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-card overflow-hidden",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 p-4 border-b border-border",
          styles.headerBg
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
                styles.iconContainer
              )}
            >
              <Icon className={cn("h-[18px] w-[18px]", styles.iconColor)} />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-semibold text-sm">{title}</h2>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
