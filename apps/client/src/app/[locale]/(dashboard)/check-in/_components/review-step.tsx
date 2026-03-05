"use client";

import { useMemo, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { ClipboardCheck, Dumbbell, UtensilsCrossed, Camera } from "lucide-react";
import { SectionCard } from "@fitfast/ui/section-card";
import { Textarea } from "@fitfast/ui/textarea";
import type { CheckInFormData, ProgressPhotos } from "../page";

interface ReviewStepProps {
  progressPhotos: ProgressPhotos;
  inBodyFile: File | null;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between p-4">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

export function ReviewStep({ progressPhotos, inBodyFile }: ReviewStepProps) {
  const t = useTranslations("checkIn");
  const tUnits = useTranslations("units");
  const { register, watch } = useFormContext<CheckInFormData>();

  const weight = watch("weight");
  const measurementMethod = watch("measurementMethod");
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

  // Preview URLs for progress photos
  const photoUrls = useMemo(() => {
    const urls: Record<string, string | null> = {};
    for (const pos of ["front", "back", "side"] as const) {
      urls[pos] = progressPhotos[pos] ? URL.createObjectURL(progressPhotos[pos]) : null;
    }
    return urls;
  }, [progressPhotos]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(photoUrls)) {
        if (url) URL.revokeObjectURL(url);
      }
    };
  }, [photoUrls]);

  // Collect non-empty manual measurements
  const measurements = [
    { label: t("chest"), value: chest },
    { label: t("waist"), value: waist },
    { label: t("hips"), value: hips },
    { label: t("arms"), value: arms },
    { label: t("thighs"), value: thighs },
  ].filter((m) => m.value && Number(m.value) > 0);

  const truncate = (text: string | undefined, max: number) => {
    if (!text) return t("none");
    return text.length > max ? `${text.slice(0, max)}...` : text;
  };

  const photoCount = [progressPhotos.front, progressPhotos.back, progressPhotos.side].filter(
    Boolean,
  ).length;

  const photoLabels: Record<string, string> = {
    front: t("photoFront"),
    back: t("photoBack"),
    side: t("photoSide"),
  };

  return (
    <div className="space-y-4">
      {/* Body Section */}
      <SectionCard icon={ClipboardCheck} title={t("reviewBody")}>
        <div className="divide-border -m-5 divide-y">
          <ReviewRow label={t("weight")} value={weight ? `${weight} ${tUnits("kg")}` : "—"} />
          {measurementMethod === "manual" &&
            measurements.map((m) => (
              <ReviewRow key={m.label} label={m.label} value={`${m.value} ${tUnits("cm")}`} />
            ))}
          {measurementMethod === "inbody" && (
            <ReviewRow label={t("inBodyUpload")} value={inBodyFile ? inBodyFile.name : t("none")} />
          )}
        </div>
      </SectionCard>

      {/* Fitness Section */}
      <SectionCard icon={Dumbbell} title={t("reviewFitness")}>
        <div className="divide-border -m-5 divide-y">
          <ReviewRow label={t("performance")} value={truncate(workoutPerformance, 100)} />
          <ReviewRow label={t("energy")} value={`${energyLevel}/10`} />
          <ReviewRow label={t("sleep")} value={`${sleepQuality}/10`} />
        </div>
      </SectionCard>

      {/* Diet Section */}
      <SectionCard icon={UtensilsCrossed} title={t("reviewDiet")}>
        <div className="divide-border -m-5 divide-y">
          <ReviewRow label={t("adherence")} value={`${dietaryAdherence}/10`} />
          <ReviewRow label={t("dietNotes")} value={truncate(dietNotes, 80)} />
          <ReviewRow label={t("injuries")} value={truncate(newInjuries, 80)} />
        </div>
      </SectionCard>

      {/* Photos Section */}
      <SectionCard icon={Camera} title={t("photos")}>
        {photoCount > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {(["front", "back", "side"] as const).map((pos) =>
              photoUrls[pos] ? (
                <div key={pos} className="text-center">
                  <img
                    src={photoUrls[pos]!}
                    alt={photoLabels[pos]}
                    className="border-border aspect-[3/4] w-full rounded-lg border object-cover"
                  />
                  <p className="text-muted-foreground mt-1 text-xs">{photoLabels[pos]}</p>
                </div>
              ) : null,
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t("noPhotos")}</p>
        )}
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
