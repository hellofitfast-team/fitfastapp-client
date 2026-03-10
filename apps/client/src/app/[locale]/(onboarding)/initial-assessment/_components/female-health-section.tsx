"use client";

import { useTranslations } from "next-intl";
import { Heart, AlertTriangle } from "lucide-react";
import { SectionCard } from "@fitfast/ui/section-card";
import { Input } from "@fitfast/ui/input";
import { Textarea } from "@fitfast/ui/textarea";
import { cn } from "@fitfast/ui/cn";

export interface FemaleHealthData {
  menstrualStatus?: "regular" | "irregular" | "amenorrhea" | "postmenopausal" | "prefer_not_say";
  isPregnant?: boolean;
  isBreastfeeding?: boolean;
  hormonalMedication?: string;
  notes?: string;
}

interface FemaleHealthSectionProps {
  data: FemaleHealthData;
  onChange: (data: FemaleHealthData) => void;
  isLoading: boolean;
}

const MENSTRUAL_OPTIONS = [
  "regular",
  "irregular",
  "amenorrhea",
  "postmenopausal",
  "preferNotSay",
] as const;

const MENSTRUAL_VALUE_MAP: Record<string, FemaleHealthData["menstrualStatus"]> = {
  regular: "regular",
  irregular: "irregular",
  amenorrhea: "amenorrhea",
  postmenopausal: "postmenopausal",
  preferNotSay: "prefer_not_say",
};

export function FemaleHealthSection({ data, onChange, isLoading }: FemaleHealthSectionProps) {
  const t = useTranslations("onboarding.assessment.femaleHealth");

  const update = (patch: Partial<FemaleHealthData>) => {
    onChange({ ...data, ...patch });
  };

  const pillClass = (active: boolean) =>
    cn(
      "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "border-fitness/30 bg-fitness/8 text-fitness"
        : "border-border bg-card hover:bg-neutral-50",
      isLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer active:scale-[0.97]",
    );

  return (
    <SectionCard icon={Heart} title={t("title")} description={t("description")} variant="neutral">
      <div className="space-y-5">
        {/* Menstrual cycle status */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("menstrualStatus")}</label>
          <div className="flex flex-wrap gap-2">
            {MENSTRUAL_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                disabled={isLoading}
                onClick={() => update({ menstrualStatus: MENSTRUAL_VALUE_MAP[option] })}
                className={pillClass(data.menstrualStatus === MENSTRUAL_VALUE_MAP[option])}
              >
                {t(option)}
              </button>
            ))}
          </div>
        </div>

        {/* Pregnancy */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("pregnant")}</label>
          <div className="flex gap-2">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                type="button"
                disabled={isLoading}
                onClick={() => update({ isPregnant: val })}
                className={pillClass(data.isPregnant === val)}
              >
                {val ? t("yes") : t("no")}
              </button>
            ))}
          </div>
          {data.isPregnant && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-xs text-amber-700">{t("pregnancyWarning")}</p>
            </div>
          )}
        </div>

        {/* Breastfeeding */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("breastfeeding")}</label>
          <div className="flex gap-2">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                type="button"
                disabled={isLoading}
                onClick={() => update({ isBreastfeeding: val })}
                className={pillClass(data.isBreastfeeding === val)}
              >
                {val ? t("yes") : t("no")}
              </button>
            ))}
          </div>
        </div>

        {/* Hormonal medication */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("hormonalMedication")}</label>
          <Input
            placeholder={t("hormonalMedicationPlaceholder")}
            value={data.hormonalMedication ?? ""}
            onChange={(e) => update({ hormonalMedication: e.target.value || undefined })}
            disabled={isLoading}
          />
        </div>

        {/* Additional notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("notes")}</label>
          <Textarea
            placeholder={t("notesPlaceholder")}
            value={data.notes ?? ""}
            onChange={(e) => update({ notes: e.target.value || undefined })}
            disabled={isLoading}
            className="min-h-[80px]"
          />
        </div>
      </div>
    </SectionCard>
  );
}
