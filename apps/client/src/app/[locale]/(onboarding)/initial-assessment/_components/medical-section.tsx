"use client";

import { useTranslations } from "next-intl";
import { Stethoscope } from "lucide-react";
import { SectionCard } from "@fitfast/ui/section-card";
import { Textarea } from "@fitfast/ui/textarea";

interface MedicalSectionProps {
  medicalNotes: string;
  setMedicalNotes: (value: string) => void;
  isLoading: boolean;
}

export function MedicalSection({ medicalNotes, setMedicalNotes, isLoading }: MedicalSectionProps) {
  const t = useTranslations("onboarding.assessment");

  return (
    <SectionCard
      icon={Stethoscope}
      title={t("medicalNotesTitle")}
      description={t("medicalNotesDescription")}
      variant="neutral"
    >
      <Textarea
        placeholder={t("medicalNotesPlaceholder")}
        value={medicalNotes}
        onChange={(e) => setMedicalNotes(e.target.value)}
        disabled={isLoading}
        className="min-h-[120px]"
      />
    </SectionCard>
  );
}
