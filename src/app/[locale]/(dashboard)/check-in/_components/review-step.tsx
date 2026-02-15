"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { ClipboardCheck } from "lucide-react";
import type { CheckInFormData } from "../page";

interface ReviewStepProps {
  uploadedPhotosCount: number;
}

export function ReviewStep({ uploadedPhotosCount }: ReviewStepProps) {
  const t = useTranslations("checkIn");
  const tUnits = useTranslations("units");
  const { register, watch } = useFormContext<CheckInFormData>();

  return (
    <div className="space-y-4">
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-black p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-primary"><ClipboardCheck className="h-5 w-5 text-white" /></div>
          <h2 className="font-black text-xl text-cream">{t("review").toUpperCase()}</h2>
        </div>
        <div className="divide-y-4 divide-black">
          {[
            { label: t("weight"), value: `${watch("weight")} ${tUnits("kg").toUpperCase()}` },
            { label: t("energy"), value: `${watch("energyLevel")}/10` },
            { label: t("sleep"), value: `${watch("sleepQuality")}/10` },
            { label: t("adherence"), value: `${watch("dietaryAdherence")}/10` },
            { label: t("photos"), value: `${uploadedPhotosCount} ${t("uploaded").toUpperCase()}` },
          ].map((item) => (
            <div key={item.label} className="flex justify-between p-4">
              <span className="font-bold text-sm text-neutral-500">{item.label.toUpperCase()}</span>
              <span className="font-black">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-neutral-100 p-4">
          <h2 className="font-black text-lg">{t("additionalNotes").toUpperCase()} ({t("optional").toUpperCase()})</h2>
        </div>
        <div className="p-6">
          <textarea
            placeholder={t("placeholders.notes").toUpperCase()}
            className="w-full min-h-[100px] p-4 border-4 border-black bg-neutral-50 font-bold text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:bg-white resize-none"
            {...register("notes")}
          />
        </div>
      </div>
    </div>
  );
}
