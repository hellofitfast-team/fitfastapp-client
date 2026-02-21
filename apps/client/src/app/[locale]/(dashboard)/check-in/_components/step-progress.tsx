"use client";

import { Check, type LucideIcon } from "lucide-react";

interface StepProgressProps {
  currentStep: number;
  steps: Array<{ id: number; name: string; icon: LucideIcon }>;
}

export function StepProgress({ currentStep, steps }: StepProgressProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  currentStep > step.id
                    ? "bg-success-500 text-white"
                    : currentStep === step.id
                    ? "bg-primary text-white"
                    : "bg-neutral-100 text-muted-foreground"
                }`}
              >
                {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <p className={`mt-1.5 text-[10px] sm:text-xs font-medium hidden sm:block ${
                currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
              }`}>{step.name}</p>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                currentStep > step.id ? "bg-success-500" : "bg-neutral-200"
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
