"use client";

import { useTranslations } from "next-intl";
import { Camera, Upload, X } from "lucide-react";
import { SectionCard } from "@fitfast/ui/section-card";

interface PhotosStepProps {
  uploadedPhotos: File[];
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (index: number) => void;
}

export function PhotosStep({ uploadedPhotos, onPhotoChange, onRemovePhoto }: PhotosStepProps) {
  const t = useTranslations("checkIn");

  return (
    <SectionCard icon={Camera} title={t("photos")} description={t("maxPhotos")}>
      <input type="file" id="photo-upload" accept="image/*" multiple onChange={onPhotoChange} className="hidden" disabled={uploadedPhotos.length >= 4} />

      {uploadedPhotos.length === 0 ? (
        <label htmlFor="photo-upload" className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-border bg-neutral-50 cursor-pointer hover:bg-neutral-100 transition-colors">
          <Upload className="h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="font-semibold text-sm">{t("uploadPhotos")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("fileTypes")}</p>
        </label>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {uploadedPhotos.map((photo, index) => (
              <div key={index} className="relative rounded-xl border border-border aspect-square overflow-hidden">
                <img src={URL.createObjectURL(photo)} alt={`Progress photo ${index + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemovePhoto(index)}
                  className="absolute top-2 end-2 h-8 w-8 rounded-full bg-error-500 flex items-center justify-center text-white hover:bg-error-500/80 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {uploadedPhotos.length < 4 && (
            <label htmlFor="photo-upload" className="flex items-center justify-center h-12 rounded-lg border-2 border-dashed border-border bg-neutral-50 cursor-pointer hover:bg-neutral-100 transition-colors">
              <Upload className="h-4 w-4 me-2 text-muted-foreground" />
              <span className="text-sm font-medium">{t("addMorePhotos")}</span>
            </label>
          )}
        </div>
      )}
    </SectionCard>
  );
}
