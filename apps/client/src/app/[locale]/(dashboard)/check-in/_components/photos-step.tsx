"use client";

import { useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Camera, Upload, X } from "lucide-react";
import { SectionCard } from "@fitfast/ui/section-card";
import { MAX_UPLOAD_SIZE_MB } from "@/lib/constants";
import type { ProgressPhotos } from "../page";

interface PhotosStepProps {
  progressPhotos: ProgressPhotos;
  onPhotoChange: (position: keyof ProgressPhotos, file: File | null) => void;
}

const POSITIONS: (keyof ProgressPhotos)[] = ["front", "back", "side"];

export function PhotosStep({ progressPhotos, onPhotoChange }: PhotosStepProps) {
  const t = useTranslations("checkIn");

  const previewUrls = useMemo(() => {
    const urls: Record<string, string | null> = {};
    for (const pos of POSITIONS) {
      urls[pos] = progressPhotos[pos] ? URL.createObjectURL(progressPhotos[pos]) : null;
    }
    return urls;
  }, [progressPhotos]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(previewUrls)) {
        if (url) URL.revokeObjectURL(url);
      }
    };
  }, [previewUrls]);

  const positionLabels: Record<keyof ProgressPhotos, string> = {
    front: t("photoFront"),
    back: t("photoBack"),
    side: t("photoSide"),
  };

  return (
    <SectionCard
      icon={Camera}
      title={t("photos")}
      description={`${t("optional")} · ${t("fileTypes", { maxFileMB: MAX_UPLOAD_SIZE_MB })}`}
    >
      <div className="grid grid-cols-3 gap-3">
        {POSITIONS.map((position) => (
          <div key={position} className="flex flex-col gap-2">
            <span className="text-center text-xs font-semibold">{positionLabels[position]}</span>
            <input
              type="file"
              id={`photo-${position}`}
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                onPhotoChange(position, file);
                e.target.value = "";
              }}
              className="hidden"
            />

            {!progressPhotos[position] ? (
              <label
                htmlFor={`photo-${position}`}
                className="border-border flex aspect-[3/4] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-neutral-50 transition-colors hover:bg-neutral-100"
              >
                <Upload className="text-muted-foreground/50 mb-2 h-6 w-6" />
                <p className="text-muted-foreground text-xs">{t("tapToUpload")}</p>
              </label>
            ) : (
              <div className="border-border relative aspect-[3/4] overflow-hidden rounded-xl border">
                <img
                  src={previewUrls[position]!}
                  alt={positionLabels[position]}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onPhotoChange(position, null)}
                  aria-label={`${t("removePhoto")} ${positionLabels[position]}`}
                  className="bg-error-500 hover:bg-error-500/80 absolute end-1 top-1 flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
