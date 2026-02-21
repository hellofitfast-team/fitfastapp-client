"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@fitfast/ui/button";

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: (e?: React.MouseEvent) => void;
}

export function StepNavigation({ currentStep, totalSteps, isSubmitting, onBack, onNext }: StepNavigationProps) {
  const t = useTranslations("checkIn");
  const tCommon = useTranslations("common");

  return (
    <div className="flex items-center justify-between gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        disabled={currentStep === 1 || isSubmitting}
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {tCommon("back")}
      </Button>

      {currentStep < totalSteps ? (
        <Button type="button" variant="gradient" onClick={onNext} disabled={isSubmitting}>
          {tCommon("next")}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Button>
      ) : (
        <Button type="submit" variant="gradient" disabled={isSubmitting} loading={isSubmitting}>
          {isSubmitting ? (
            t("submitting")
          ) : (
            <>
              {t("submitCheckIn")}
              <Check className="h-4 w-4" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
