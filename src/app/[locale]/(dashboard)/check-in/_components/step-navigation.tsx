"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

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
    <div className="flex items-center justify-between gap-4">
      <button
        type="button"
        onClick={onBack}
        disabled={currentStep === 1 || isSubmitting}
        className="h-14 px-6 border-4 border-black bg-cream font-black text-sm uppercase tracking-wide hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {tCommon("back").toUpperCase()}
      </button>

      {currentStep < totalSteps ? (
        <button
          type="button"
          onClick={onNext}
          disabled={isSubmitting}
          className="h-14 px-6 bg-black text-cream font-black text-sm uppercase tracking-wide hover:bg-primary disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {tCommon("next").toUpperCase()}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-14 px-8 bg-primary text-white font-black text-sm uppercase tracking-wide hover:bg-primary-dark hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("submitting").toUpperCase()}
            </>
          ) : (
            <>
              {t("submitCheckIn").toUpperCase()}
              <Check className="h-4 w-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
