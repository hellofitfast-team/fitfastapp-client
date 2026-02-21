"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { ClipboardCheck } from "lucide-react";
import { SectionCard } from "@fitfast/ui/section-card";
import { Textarea } from "@fitfast/ui/textarea";
import type { CheckInFormData } from "../page";

interface ReviewStepProps {
  uploadedPhotosCount: number;
}

export function ReviewStep({ uploadedPhotosCount }: ReviewStepProps) {
  const t = useTranslations("checkIn");
  const tUnits = useTranslations("units");
  const { register, watch } = useFormContext<CheckInFormData>();

  return (
    <div className="space-y-4">
      <SectionCard icon={ClipboardCheck} title={t("review")}>
        <div className="-m-5 divide-y divide-border">
          {[
            { label: t("weight"), value: `${watch("weight")} ${tUnits("kg")}` },
            { label: t("energy"), value: `${watch("energyLevel")}/10` },
            { label: t("sleep"), value: `${watch("sleepQuality")}/10` },
            { label: t("adherence"), value: `${watch("dietaryAdherence")}/10` },
            { label: t("photos"), value: `${uploadedPhotosCount} ${t("uploaded")}` },
          ].map((item) => (
            <div key={item.label} className="flex justify-between p-4">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="font-semibold text-sm">{item.value}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={`${t("additionalNotes")} (${t("optional")})`} variant="neutral">
        <Textarea
          placeholder={t("placeholders.notes")}
          className="min-h-[100px]"
          {...register("notes")}
        />
      </SectionCard>
    </div>
  );
}
