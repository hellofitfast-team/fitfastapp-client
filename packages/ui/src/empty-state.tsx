"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "./button";
import { cn } from "./cn";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-10 text-center", className)}>
      <div className="flex h-14 w-14 items-center justify-center mx-auto rounded-full bg-neutral-100">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="mt-5 font-semibold text-lg">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} className="mt-5">
          {action.label}
        </Button>
      )}
    </div>
  );
}
