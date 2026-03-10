"use client";

import { useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Ruler, Upload, X } from "lucide-react";
import { SectionCard } from "@fitfast/ui/section-card";
import { Input } from "@fitfast/ui/input";
import { cn } from "@fitfast/ui/cn";
import { MAX_UPLOAD_SIZE_MB } from "@/lib/constants";

interface MeasurementsSectionProps {
  measurementMethod: "manual" | "inbody";
  setMeasurementMethod: (method: "manual" | "inbody") => void;
  chest: string;
  setChest: (value: string) => void;
  waist: string;
  setWaist: (value: string) => void;
  hips: string;
  setHips: (value: string) => void;
  arms: string;
  setArms: (value: string) => void;
  thighs: string;
  setThighs: (value: string) => void;
  inBodyFile: File | null;
  onInBodyFileChange: (file: File | null) => void;
  isLoading: boolean;
}

export function MeasurementsSection({
  measurementMethod,
  setMeasurementMethod,
  chest,
  setChest,
  waist,
  setWaist,
  hips,
  setHips,
  arms,
  setArms,
  thighs,
  setThighs,
  inBodyFile,
  onInBodyFileChange,
  isLoading,
}: MeasurementsSectionProps) {
  const t = useTranslations("onboarding.assessment");

  const handleMethodChange = (method: "manual" | "inbody") => {
    setMeasurementMethod(method);
    if (method === "inbody") {
      setChest("");
      setWaist("");
      setHips("");
      setArms("");
      setThighs("");
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

  const measurementFields = [
    { key: "chest", value: chest, setter: setChest, label: t("chest") },
    { key: "waist", value: waist, setter: setWaist, label: t("waist") },
    { key: "hips", value: hips, setter: setHips, label: t("hips") },
    { key: "arms", value: arms, setter: setArms, label: t("arms") },
    { key: "thighs", value: thighs, setter: setThighs, label: t("thighs") },
  ];

  return (
    <div className="space-y-4">
      <SectionCard icon={Ruler} title={t("measurementsTitle")} description={t("measurementsDesc")}>
        {/* Method toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleMethodChange("manual")}
            disabled={isLoading}
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
            disabled={isLoading}
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
      </SectionCard>

      {/* Manual measurements */}
      {measurementMethod === "manual" && (
        <SectionCard title={t("allInCm")} variant="neutral">
          <div className="grid gap-4 sm:grid-cols-2">
            {measurementFields.map((m) => (
              <div key={m.key} className="space-y-1.5">
                <label className="text-muted-foreground text-sm font-medium">{m.label}</label>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="0"
                  value={m.value}
                  onChange={(e) => m.setter(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* InBody upload */}
      {measurementMethod === "inbody" && (
        <SectionCard
          title={t("inBodyUpload")}
          description={t("uploadInBodyDescription")}
          variant="neutral"
        >
          <p className="text-muted-foreground mb-3 text-xs">{t("manualRecommended")}</p>

          <input
            type="file"
            id="assessment-inbody-upload"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              onInBodyFileChange(file);
              e.target.value = "";
            }}
            className="hidden"
            disabled={isLoading}
          />

          {!inBodyFile ? (
            <label
              htmlFor="assessment-inbody-upload"
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
                disabled={isLoading}
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
