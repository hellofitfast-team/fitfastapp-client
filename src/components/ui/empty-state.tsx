"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    <div className={cn("border-4 border-black bg-cream p-12 text-center", className)}>
      <div className="flex h-16 w-16 items-center justify-center mx-auto bg-neutral-100 border-4 border-black">
        <Icon className="h-8 w-8 text-neutral-400" />
      </div>
      <h3 className="mt-6 font-black text-xl uppercase tracking-tight">{title}</h3>
      <p className="mt-2 font-mono text-xs text-neutral-500 max-w-md mx-auto">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} className="mt-6">
          {action.label}
        </Button>
      )}
    </div>
  );
}
