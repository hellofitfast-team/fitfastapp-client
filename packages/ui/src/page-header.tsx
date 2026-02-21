import * as React from "react";
import { cn } from "./cn";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm font-medium text-primary">{subtitle}</p>
        )}
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
