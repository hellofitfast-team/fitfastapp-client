"use client";

import { useTranslations } from "next-intl";
import { Camera, Upload, X } from "lucide-react";

interface PhotosStepProps {
  uploadedPhotos: File[];
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (index: number) => void;
}

export function PhotosStep({ uploadedPhotos, onPhotoChange, onRemovePhoto }: PhotosStepProps) {
  const t = useTranslations("checkIn");

  return (
    <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="border-b-4 border-black bg-primary p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center bg-black"><Camera className="h-5 w-5 text-primary" /></div>
        <div>
          <h2 className="font-black text-xl text-black">{t("photos").toUpperCase()}</h2>
          <p className="font-bold text-sm text-black/70">{t("maxPhotos").toUpperCase()}</p>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <input type="file" id="photo-upload" accept="image/*" multiple onChange={onPhotoChange} className="hidden" disabled={uploadedPhotos.length >= 4} />

        {uploadedPhotos.length === 0 ? (
          <label htmlFor="photo-upload" className="flex flex-col items-center justify-center h-48 border-4 border-dashed border-black bg-neutral-100 cursor-pointer hover:bg-neutral-200 transition-colors">
            <Upload className="h-10 w-10 text-neutral-400 mb-3" />
            <p className="font-black">{t("uploadPhotos").toUpperCase()}</p>
            <p className="font-bold text-sm text-neutral-500 mt-1">{t("fileTypes").toUpperCase()}</p>
          </label>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {uploadedPhotos.map((photo, index) => (
                <div key={index} className="relative border-4 border-black aspect-square overflow-hidden">
                  <img src={URL.createObjectURL(photo)} alt={`Progress photo ${index + 1}`} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => onRemovePhoto(index)} className="absolute top-2 end-2 h-12 w-12 bg-error-500 border-2 border-black flex items-center justify-center text-white hover:bg-black transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            {uploadedPhotos.length < 4 && (
              <label htmlFor="photo-upload" className="flex items-center justify-center h-14 border-4 border-dashed border-black bg-neutral-100 cursor-pointer hover:bg-neutral-200 transition-colors">
                <Upload className="h-5 w-5 me-2 text-neutral-400" />
                <span className="font-bold text-sm uppercase">{t("addMorePhotos")}</span>
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
