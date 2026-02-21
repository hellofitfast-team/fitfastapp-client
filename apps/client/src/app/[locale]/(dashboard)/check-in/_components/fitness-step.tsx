"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Dumbbell } from "lucide-react";
import { SectionCard } from "@fitfast/ui/section-card";
import { RatingSelector } from "@fitfast/ui/rating-selector";
import { Textarea } from "@fitfast/ui/textarea";
import type { CheckInFormData } from "../page";

export function FitnessStep() {
  const t = useTranslations("checkIn");
  const { register, formState: { errors }, watch, setValue } = useFormContext<CheckInFormData>();

  const energyLevel = watch("energyLevel");
  const sleepQuality = watch("sleepQuality");

  return (
    <div className="space-y-4">
      <SectionCard icon={Dumbbell} title={t("performance")} variant="fitness">
        <Textarea
          placeholder={t("placeholders.performance")}
          className="min-h-[120px]"
          {...register("workoutPerformance")}
        />
        {errors.workoutPerformance && <p className="mt-2 text-xs text-error-500">{errors.workoutPerformance.message}</p>}
      </SectionCard>

      <SectionCard title={t("wellbeingMetrics")} variant="fitness">
        <div className="space-y-5">
          <RatingSelector
            label={t("energy")}
            value={energyLevel}
            onChange={(v) => setValue("energyLevel", v)}
          />
          <RatingSelector
            label={t("sleep")}
            value={sleepQuality}
            onChange={(v) => setValue("sleepQuality", v)}
          />
        </div>
      </SectionCard>
    </div>
  );
}
