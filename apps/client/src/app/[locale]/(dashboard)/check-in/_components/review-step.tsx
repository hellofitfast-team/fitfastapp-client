"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { ClipboardCheck, Dumbbell, UtensilsCrossed, Camera } from "lucide-react";
import { SectionCard } from "@fitfast/ui/section-card";
import { Textarea } from "@fitfast/ui/textarea";
import type { CheckInFormData } from "../page";

interface ReviewStepProps {
  uploadedPhotosCount: number;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

export function ReviewStep({ uploadedPhotosCount }: ReviewStepProps) {
  const t = useTranslations("checkIn");
  const tUnits = useTranslations("units");
  const { register, watch } = useFormContext<CheckInFormData>();

  const weight = watch("weight");
  const chest = watch("chest");
  const waist = watch("waist");
  const hips = watch("hips");
  const arms = watch("arms");
  const thighs = watch("thighs");
  const workoutPerformance = watch("workoutPerformance");
  const energyLevel = watch("energyLevel");
  const sleepQuality = watch("sleepQuality");
  const dietaryAdherence = watch("dietaryAdherence");
  const dietNotes = watch("dietNotes");
  const newInjuries = watch("newInjuries");

  // Collect non-empty measurements
  const measurements = [
    { label: t("chest"), value: chest },
    { label: t("waist"), value: waist },
    { label: t("hips"), value: hips },
    { label: t("arms"), value: arms },
    { label: t("thighs"), value: thighs },
  ].filter((m) => m.value && Number(m.value) > 0);

  // Truncate helper
  const truncate = (text: string | undefined, max: number) => {
    if (!text) return t("none");
    return text.length > max ? `${text.slice(0, max)}...` : text;
  };

  return (
    <div className="space-y-4">
      {/* Body Section */}
      <SectionCard icon={ClipboardCheck} title={t("reviewBody")}>
        <div className="-m-5 divide-y divide-border">
          <ReviewRow
            label={t("weight")}
            value={weight ? `${weight} ${tUnits("kg")}` : "—"}
          />
          {measurements.map((m) => (
            <ReviewRow
              key={m.label}
              label={m.label}
              value={`${m.value} ${tUnits("cm")}`}
            />
          ))}
        </div>
      </SectionCard>

      {/* Fitness Section */}
      <SectionCard icon={Dumbbell} title={t("reviewFitness")}>
        <div className="-m-5 divide-y divide-border">
          <ReviewRow
            label={t("performance")}
            value={truncate(workoutPerformance, 100)}
          />
          <ReviewRow
            label={t("energy")}
            value={`${energyLevel}/10`}
          />
          <ReviewRow
            label={t("sleep")}
            value={`${sleepQuality}/10`}
          />
        </div>
      </SectionCard>

      {/* Diet Section */}
      <SectionCard icon={UtensilsCrossed} title={t("reviewDiet")}>
        <div className="-m-5 divide-y divide-border">
          <ReviewRow
            label={t("adherence")}
            value={`${dietaryAdherence}/10`}
          />
          <ReviewRow
            label={t("dietNotes")}
            value={truncate(dietNotes, 80)}
          />
          <ReviewRow
            label={t("injuries")}
            value={truncate(newInjuries, 80)}
          />
        </div>
      </SectionCard>

      {/* Photos Section */}
      <SectionCard icon={Camera} title={t("photos")}>
        <div className="-m-5 divide-y divide-border">
          <ReviewRow
            label={t("photos")}
            value={
              uploadedPhotosCount > 0
                ? t("photosUploaded", { count: uploadedPhotosCount })
                : t("noPhotos")
            }
          />
        </div>
      </SectionCard>

      {/* Additional Notes */}
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
