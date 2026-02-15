"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { UtensilsCrossed } from "lucide-react";
import type { CheckInFormData } from "../page";

export function DietaryStep() {
  const t = useTranslations("checkIn");
  const { register, watch, setValue } = useFormContext<CheckInFormData>();

  const dietaryAdherence = watch("dietaryAdherence");

  return (
    <div className="space-y-4">
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-primary p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-black"><UtensilsCrossed className="h-5 w-5 text-primary" /></div>
          <h2 className="font-black text-xl text-white">{t("adherence").toUpperCase()}</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-3">
            <label className="font-bold text-sm uppercase">{t("adherenceRating")}</label>
            <span className="text-2xl font-black text-primary">{dietaryAdherence}/10</span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setValue("dietaryAdherence", num)}
                className={`flex-1 h-12 border-4 border-black font-black text-xs transition-colors ${
                  dietaryAdherence >= num ? "bg-primary text-white" : "bg-neutral-100 hover:bg-neutral-200"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
          <textarea
            placeholder={t("placeholders.dietNotes").toUpperCase()}
            className="w-full min-h-[100px] p-4 border-4 border-black bg-neutral-50 font-bold text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:bg-white resize-none"
            {...register("dietNotes")}
          />
        </div>
      </div>

      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-neutral-100 p-4">
          <h2 className="font-black text-lg">{t("injuries").toUpperCase()} ({t("optional").toUpperCase()})</h2>
        </div>
        <div className="p-6">
          <textarea
            placeholder={t("placeholders.injuries").toUpperCase()}
            className="w-full min-h-[100px] p-4 border-4 border-black bg-neutral-50 font-bold text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:bg-white resize-none"
            {...register("newInjuries")}
          />
        </div>
      </div>
    </div>
  );
}
