"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Weight } from "lucide-react";
import { SectionCard } from "@fitfast/ui/section-card";
import { FormField } from "@fitfast/ui/form-field";
import { Input } from "@fitfast/ui/input";
import type { CheckInFormData } from "../page";

export function WeightStep() {
  const t = useTranslations("checkIn");
  const tUnits = useTranslations("units");
  const { register, formState: { errors } } = useFormContext<CheckInFormData>();

  return (
    <div className="space-y-4">
      <SectionCard icon={Weight} title={t("weight")}>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            step="0.1"
            placeholder="75.5"
            className="w-32 text-xl font-bold text-center"
            {...register("weight")}
            error={!!errors.weight}
          />
          <span className="font-semibold text-muted-foreground">{tUnits("kg")}</span>
        </div>
        {errors.weight && <p className="mt-2 text-xs text-error-500">{errors.weight.message}</p>}
      </SectionCard>

      <SectionCard title={`${t("measurements")} (${t("optional")})`} description={`${t("allIn")} ${tUnits("cm")}`} variant="neutral">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { key: "chest" as const, label: t("chest") },
            { key: "waist" as const, label: t("waist") },
            { key: "hips" as const, label: t("hips") },
            { key: "arms" as const, label: t("arms") },
            { key: "thighs" as const, label: t("thighs") },
          ].map((m) => (
            <FormField key={m.key} label={m.label}>
              <Input
                type="number"
                step="0.5"
                placeholder="0"
                {...register(m.key)}
              />
            </FormField>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
