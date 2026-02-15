"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Dumbbell } from "lucide-react";
import type { CheckInFormData } from "../page";

export function FitnessStep() {
  const t = useTranslations("checkIn");
  const { register, formState: { errors }, watch, setValue } = useFormContext<CheckInFormData>();

  const energyLevel = watch("energyLevel");
  const sleepQuality = watch("sleepQuality");

  return (
    <div className="space-y-4">
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-primary p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-black"><Dumbbell className="h-5 w-5 text-primary" /></div>
          <h2 className="font-black text-xl text-black">{t("performance").toUpperCase()}</h2>
        </div>
        <div className="p-6">
          <textarea
            placeholder={t("placeholders.performance").toUpperCase()}
            className="w-full min-h-[120px] p-4 border-4 border-black bg-cream font-bold text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:bg-white resize-none"
            {...register("workoutPerformance")}
          />
          {errors.workoutPerformance && <p className="mt-2 font-bold text-sm text-error-500">{errors.workoutPerformance.message}</p>}
        </div>
      </div>

      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-black p-4">
          <h2 className="font-black text-lg text-cream">{t("wellbeingMetrics").toUpperCase()}</h2>
        </div>
        <div className="p-6 space-y-6">
          {[
            { key: "energyLevel" as const, label: t("energy"), value: energyLevel },
            { key: "sleepQuality" as const, label: t("sleep"), value: sleepQuality },
          ].map((metric) => (
            <div key={metric.key}>
              <div className="flex items-center justify-between mb-3">
                <label className="font-bold text-sm uppercase">{metric.label}</label>
                <span className="text-2xl font-black text-primary">{metric.value}/10</span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setValue(metric.key, num)}
                    className={`flex-1 h-12 border-4 border-black font-black text-xs transition-colors ${
                      metric.value >= num ? "bg-primary text-white" : "bg-neutral-100 hover:bg-neutral-200"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
