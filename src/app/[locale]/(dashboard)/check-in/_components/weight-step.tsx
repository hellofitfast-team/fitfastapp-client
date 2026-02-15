"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Weight } from "lucide-react";
import type { CheckInFormData } from "../page";

export function WeightStep() {
  const t = useTranslations("checkIn");
  const tUnits = useTranslations("units");
  const { register, formState: { errors } } = useFormContext<CheckInFormData>();

  return (
    <div className="space-y-4">
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-primary p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-black"><Weight className="h-5 w-5 text-primary" /></div>
          <h2 className="font-black text-xl text-white">{t("weight").toUpperCase()}</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <input
              type="number"
              step="0.1"
              placeholder="75.5"
              className="w-32 h-14 px-4 border-4 border-black bg-cream font-black text-2xl text-center focus:outline-none focus:bg-white transition-colors"
              {...register("weight")}
            />
            <span className="font-black text-xl">{tUnits("kg").toUpperCase()}</span>
          </div>
          {errors.weight && <p className="mt-2 font-mono text-xs text-error-500">{errors.weight.message}</p>}
        </div>
      </div>

      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-neutral-100 p-4">
          <h2 className="font-black text-lg">{t("measurements").toUpperCase()} ({t("optional").toUpperCase()})</h2>
          <p className="font-bold text-sm text-neutral-500">{t("allIn").toUpperCase()} {tUnits("cm").toUpperCase()}</p>
        </div>
        <div className="p-6 grid gap-4 sm:grid-cols-2">
          {[
            { key: "chest" as const, label: t("chest") },
            { key: "waist" as const, label: t("waist") },
            { key: "hips" as const, label: t("hips") },
            { key: "arms" as const, label: t("arms") },
            { key: "thighs" as const, label: t("thighs") },
          ].map((m) => (
            <div key={m.key}>
              <label className="block font-bold text-xs uppercase mb-2">{m.label}</label>
              <input type="number" step="0.5" placeholder="0" className="w-full h-12 px-4 border-4 border-black bg-cream font-mono text-sm focus:outline-none focus:bg-white" {...register(m.key)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
