"use client";

import { Check, type LucideIcon } from "lucide-react";

interface StepProgressProps {
  currentStep: number;
  steps: Array<{ id: number; name: string; icon: LucideIcon }>;
}

export function StepProgress({ currentStep, steps }: StepProgressProps) {
  return (
    <div className="border-4 border-black bg-cream">
      <div className="flex">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex-1 p-3 border-e-4 last:border-e-0 border-black text-center transition-colors ${
              currentStep > step.id
                ? "bg-success-500"
                : currentStep === step.id
                ? "bg-primary"
                : "bg-neutral-100"
            }`}
          >
            <div className={`h-8 w-8 mx-auto flex items-center justify-center border-4 border-black ${
              currentStep > step.id ? "bg-black text-success-500" : currentStep === step.id ? "bg-black text-primary" : "bg-white text-neutral-400"
            }`}>
              {currentStep > step.id ? <Check className="h-4 w-4" /> : <span className="text-xs font-black">{step.id}</span>}
            </div>
            <p className={`mt-2 font-bold text-[10px] sm:text-xs hidden sm:block ${
              currentStep > step.id ? "text-black" : currentStep === step.id ? "text-white" : "text-black"
            }`}>{step.name.toUpperCase()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
