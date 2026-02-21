"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { SectionCard } from "@fitfast/ui/section-card";
import { EmptyState } from "@fitfast/ui/empty-state";
import type { CheckIn } from "@/types/convex";
import { formatDate, formatTime } from "@/lib/utils";

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
  const locale = useLocale();
  const router = useRouter();

  return (
    <SectionCard icon={Calendar} title={t("checkInHistory")} description={t("checkInHistoryDescription")} variant="routine">
      <div className="-m-5 divide-y divide-border">
        {checkIns.length > 0 ? (
          checkIns.slice().reverse().map((checkIn) => {
            const measurements = checkIn.measurements as MeasurementData;
            return (
              <div key={checkIn._id} className="p-4 hover:bg-neutral-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">
                      {formatDate(new Date(checkIn._creationTime).toISOString(), locale)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(new Date(checkIn._creationTime).toISOString(), locale)}
                    </p>
                  </div>
                  {checkIn.weight && (
                    <div className="rounded-lg bg-primary/10 px-3 py-1.5">
                      <span className="text-lg font-bold text-primary">{checkIn.weight}</span>
                      <span className="text-xs text-primary ms-1">{tUnits("kg") || "KG"}</span>
                    </div>
                  )}
                </div>

                {measurements && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                    {measurements.chest && (
                      <div className="rounded-lg bg-neutral-100 p-2.5">
                        <p className="text-xs text-muted-foreground">{tCheckIn("chest")}</p>
                        <p className="font-semibold text-sm">{measurements.chest} {tUnits("cm")}</p>
                      </div>
                    )}
                    {measurements.waist && (
                      <div className="rounded-lg bg-neutral-100 p-2.5">
                        <p className="text-xs text-muted-foreground">{tCheckIn("waist")}</p>
                        <p className="font-semibold text-sm">{measurements.waist} {tUnits("cm")}</p>
                      </div>
                    )}
                    {measurements.hips && (
                      <div className="rounded-lg bg-neutral-100 p-2.5">
                        <p className="text-xs text-muted-foreground">{tCheckIn("hips")}</p>
                        <p className="font-semibold text-sm">{measurements.hips} {tUnits("cm")}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 text-xs">
                  {checkIn.energyLevel !== undefined && checkIn.energyLevel !== null && (
                    <span className="text-muted-foreground">{tCheckIn("energy")}: <span className="font-semibold text-foreground">{checkIn.energyLevel}/10</span></span>
                  )}
                  {checkIn.sleepQuality !== undefined && checkIn.sleepQuality !== null && (
                    <span className="text-muted-foreground">{tCheckIn("sleep")}: <span className="font-semibold text-foreground">{checkIn.sleepQuality}/10</span></span>
                  )}
                  {checkIn.dietaryAdherence !== undefined && checkIn.dietaryAdherence !== null && (
                    <span className="text-muted-foreground">{tCheckIn("adherence")}: <span className="font-semibold text-foreground">{checkIn.dietaryAdherence}/10</span></span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-5">
            <EmptyState
              icon={Calendar}
              title={tEmpty("noCheckIns.title")}
              description={tEmpty("noCheckIns.description")}
              action={{
                label: tEmpty("noCheckIns.action"),
                onClick: () => router.push("/check-in"),
              }}
            />
          </div>
        )}
      </div>
    </SectionCard>
  );
}
