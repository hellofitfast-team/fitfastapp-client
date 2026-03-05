"use client";

import { useMemo, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Weight, Upload, X } from "lucide-react";
import { SectionCard } from "@fitfast/ui/section-card";
import { FormField } from "@fitfast/ui/form-field";
import { Input } from "@fitfast/ui/input";
import { cn } from "@fitfast/ui/cn";
import type { CheckInFormData } from "../page";
import { MAX_UPLOAD_SIZE_MB } from "@/lib/constants";

interface WeightStepProps {
  inBodyFile: File | null;
  onInBodyFileChange: (file: File | null) => void;
}

export function WeightStep({ inBodyFile, onInBodyFileChange }: WeightStepProps) {
  const t = useTranslations("checkIn");
  const tUnits = useTranslations("units");
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CheckInFormData>();

  const measurementMethod = watch("measurementMethod");

  // Clear the other method's data when switching
  const handleMethodChange = (method: "manual" | "inbody") => {
    setValue("measurementMethod", method);
    if (method === "inbody") {
      setValue("chest", undefined);
      setValue("waist", undefined);
      setValue("hips", undefined);
      setValue("arms", undefined);
      setValue("thighs", undefined);
    } else {
      onInBodyFileChange(null);
    }
  };

  const inBodyPreviewUrl = useMemo(
    () => (inBodyFile ? URL.createObjectURL(inBodyFile) : null),
    [inBodyFile],
  );
  useEffect(() => {
    return () => {
      if (inBodyPreviewUrl) URL.revokeObjectURL(inBodyPreviewUrl);
    };
  }, [inBodyPreviewUrl]);

  return (
    <div className="space-y-4">
      <SectionCard icon={Weight} title={t("weight")}>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            step="0.1"
            placeholder="75.5"
            className="w-32 text-center text-xl font-bold"
            {...register("weight")}
            error={!!errors.weight}
          />
          <span className="text-muted-foreground font-semibold">{tUnits("kg")}</span>
        </div>
        {errors.weight && <p className="text-error-500 mt-2 text-xs">{errors.weight.message}</p>}
      </SectionCard>

      {/* Measurement Method Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleMethodChange("manual")}
          className={cn(
            "flex-1 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all",
            measurementMethod === "manual"
              ? "border-primary bg-primary/5 text-primary"
              : "border-border text-muted-foreground hover:border-neutral-300",
          )}
        >
          {t("manualMeasurements")}
          <span className="text-muted-foreground ms-1 text-xs font-normal">
            ({t("recommended")})
          </span>
        </button>
        <button
          type="button"
          onClick={() => handleMethodChange("inbody")}
          className={cn(
            "flex-1 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all",
            measurementMethod === "inbody"
              ? "border-primary bg-primary/5 text-primary"
              : "border-border text-muted-foreground hover:border-neutral-300",
          )}
        >
          {t("inBodyUpload")}
        </button>
      </div>

      {/* Manual Measurements */}
      {measurementMethod === "manual" && (
        <SectionCard
          title={`${t("measurements")} (${t("optional")})`}
          description={`${t("allIn")} ${tUnits("cm")}`}
          variant="neutral"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { key: "chest" as const, label: t("chest") },
              { key: "waist" as const, label: t("waist") },
              { key: "hips" as const, label: t("hips") },
              { key: "arms" as const, label: t("arms") },
              { key: "thighs" as const, label: t("thighs") },
            ].map((m) => (
              <FormField key={m.key} label={m.label}>
                <Input type="number" step="0.5" placeholder="0" {...register(m.key)} />
              </FormField>
            ))}
          </div>
        </SectionCard>
      )}

      {/* InBody Upload */}
      {measurementMethod === "inbody" && (
        <SectionCard
          title={t("inBodyUpload")}
          description={t("uploadInBodyDescription")}
          variant="neutral"
        >
          <input
            type="file"
            id="inbody-upload"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              onInBodyFileChange(file);
              e.target.value = "";
            }}
            className="hidden"
          />

          {!inBodyFile ? (
            <label
              htmlFor="inbody-upload"
              className="border-border flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-neutral-50 transition-colors hover:bg-neutral-100"
            >
              <Upload className="text-muted-foreground/50 mb-3 h-8 w-8" />
              <p className="text-sm font-semibold">{t("uploadInBody")}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {t("fileTypes", { maxFileMB: MAX_UPLOAD_SIZE_MB })}
              </p>
            </label>
          ) : (
            <div className="border-border relative overflow-hidden rounded-xl border">
              <img
                src={inBodyPreviewUrl!}
                alt={t("inBodyResult")}
                className="max-h-64 w-full object-contain"
              />
              <button
                type="button"
                onClick={() => onInBodyFileChange(null)}
                aria-label={t("removeFile")}
                className="bg-error-500 hover:bg-error-500/80 absolute end-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
