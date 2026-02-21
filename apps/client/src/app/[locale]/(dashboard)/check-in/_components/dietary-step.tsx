"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { UtensilsCrossed } from "lucide-react";
import { SectionCard } from "@fitfast/ui/section-card";
import { RatingSelector } from "@fitfast/ui/rating-selector";
import { Textarea } from "@fitfast/ui/textarea";
import type { CheckInFormData } from "../page";

export function DietaryStep() {
  const t = useTranslations("checkIn");
  const { register, watch, setValue } = useFormContext<CheckInFormData>();

  const dietaryAdherence = watch("dietaryAdherence");

  return (
    <div className="space-y-4">
      <SectionCard icon={UtensilsCrossed} title={t("adherence")} variant="nutrition">
        <div className="space-y-4">
          <RatingSelector
            label={t("adherenceRating")}
            value={dietaryAdherence}
            onChange={(v) => setValue("dietaryAdherence", v)}
          />
          <Textarea
            placeholder={t("placeholders.dietNotes")}
            className="min-h-[100px]"
            {...register("dietNotes")}
          />
        </div>
      </SectionCard>

      <SectionCard title={`${t("injuries")} (${t("optional")})`} variant="neutral">
        <Textarea
          placeholder={t("placeholders.injuries")}
          className="min-h-[100px]"
          {...register("newInjuries")}
        />
      </SectionCard>
    </div>
  );
}
