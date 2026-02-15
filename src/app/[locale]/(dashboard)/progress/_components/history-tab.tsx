"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { CheckIn } from "@/types/database";

interface MeasurementData {
  chest?: number;
  waist?: number;
  hips?: number;
  arms?: number;
  thighs?: number;
}

interface HistoryTabProps {
  checkIns: CheckIn[];
}

export function HistoryTab({ checkIns }: HistoryTabProps) {
  const t = useTranslations("progress");
  const tEmpty = useTranslations("emptyStates");
  const tCheckIn = useTranslations("checkIn");
  const tUnits = useTranslations("units");
  const router = useRouter();

  return (
    <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="border-b-4 border-black bg-black p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center bg-primary">
          <Calendar className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-black text-xl text-cream tracking-tight">
            {t("checkInHistory").toUpperCase()}
          </h2>
          <p className="font-mono text-xs text-primary">{t("checkInHistoryDescription").toUpperCase()}</p>
        </div>
      </div>
      <div className="divide-y-4 divide-black">
        {checkIns.length > 0 ? (
          checkIns.slice().reverse().map((checkIn) => {
            const measurements = checkIn.measurements as MeasurementData;
            return (
              <div key={checkIn.id} className="p-5 hover:bg-neutral-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-black">
                      {new Date(checkIn.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                    <p className="font-mono text-xs text-neutral-500">
                      {new Date(checkIn.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {checkIn.weight && (
                    <div className="border-4 border-primary bg-primary/10 px-3 py-1">
                      <span className="text-2xl font-black text-primary">{checkIn.weight}</span>
                      <span className="font-mono text-xs text-primary ml-1">{tUnits("kg") || "KG"}</span>
                    </div>
                  )}
                </div>

                {measurements && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                    {measurements.chest && (
                      <div className="border-2 border-black bg-neutral-100 p-2">
                        <p className="font-bold text-sm text-neutral-500">{tCheckIn("chest").toUpperCase()}</p>
                        <p className="font-black">{measurements.chest} {tUnits("cm")}</p>
                      </div>
                    )}
                    {measurements.waist && (
                      <div className="border-2 border-black bg-neutral-100 p-2">
                        <p className="font-bold text-sm text-neutral-500">{tCheckIn("waist").toUpperCase()}</p>
                        <p className="font-black">{measurements.waist} {tUnits("cm")}</p>
                      </div>
                    )}
                    {measurements.hips && (
                      <div className="border-2 border-black bg-neutral-100 p-2">
                        <p className="font-bold text-sm text-neutral-500">{tCheckIn("hips").toUpperCase()}</p>
                        <p className="font-black">{measurements.hips} {tUnits("cm")}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-4 font-bold text-sm">
                  {checkIn.energy_level !== null && (
                    <span>{tCheckIn("energy").toUpperCase()}: <span className="font-black">{checkIn.energy_level}/10</span></span>
                  )}
                  {checkIn.sleep_quality !== null && (
                    <span>{tCheckIn("sleep").toUpperCase()}: <span className="font-black">{checkIn.sleep_quality}/10</span></span>
                  )}
                  {checkIn.dietary_adherence !== null && (
                    <span>{tCheckIn("adherence").toUpperCase()}: <span className="font-black">{checkIn.dietary_adherence}/10</span></span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState
            icon={Calendar}
            title={tEmpty("noCheckIns.title")}
            description={tEmpty("noCheckIns.description")}
            action={{
              label: tEmpty("noCheckIns.action"),
              onClick: () => router.push("/check-in"),
            }}
          />
        )}
      </div>
    </div>
  );
}
