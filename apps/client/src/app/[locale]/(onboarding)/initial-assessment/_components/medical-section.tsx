"use client";

import { Stethoscope } from "lucide-react";
import { SectionCard } from "@fitfast/ui/section-card";
import { Textarea } from "@fitfast/ui/textarea";

interface MedicalSectionProps {
  medicalNotes: string;
  setMedicalNotes: (value: string) => void;
  isLoading: boolean;
}

export function MedicalSection({
  medicalNotes,
  setMedicalNotes,
  isLoading,
}: MedicalSectionProps) {
  return (
    <SectionCard
      icon={Stethoscope}
      title="Medical Notes"
      description="Optional: injuries, conditions, or limitations"
      variant="neutral"
    >
      <Textarea
        placeholder="E.g., knee injury, back pain, diabetes, high blood pressure..."
        value={medicalNotes}
        onChange={(e) => setMedicalNotes(e.target.value)}
        disabled={isLoading}
        className="min-h-[120px]"
      />
    </SectionCard>
  );
}
