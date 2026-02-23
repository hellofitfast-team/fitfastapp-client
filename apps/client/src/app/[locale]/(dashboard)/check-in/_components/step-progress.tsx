"use client";

import type { LucideIcon } from "lucide-react";

interface StepProgressProps {
  currentStep: number;
  steps: Array<{ id: number; name: string; icon: LucideIcon }>;
}

export function StepProgress({ currentStep, steps }: StepProgressProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
              currentStep >= step.id ? "bg-primary" : "bg-neutral-200"
            }`}
          />
        ))}
      </div>
      <div className="flex gap-1.5">
        {steps.map((step) => (
          <p
            key={step.id}
            className={`flex-1 text-center text-[10px] font-medium ${
              currentStep >= step.id
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {step.name}
          </p>
        ))}
      </div>
    </div>
  );
}
