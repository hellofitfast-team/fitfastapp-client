"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Weight } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { SectionCard } from "@fitfast/ui/section-card";

const CHART_COLORS = {
  primary: "#4169E1",
  background: "#ffffff",
  foreground: "#0a0a0a",
  success: "#22c55e",
} as const;

interface WeightChartDatum {
  date: string;
  weight: number | null;
}

interface MeasurementChartDatum {
  date: string;
  chest?: number;
  waist?: number;
  hips?: number;
  arms?: number;
  thighs?: number;
}

interface AdherenceStats {
  mealAdherence: number;
  workoutAdherence: number;
}

interface ProgressChartsProps {
  weightChartData: WeightChartDatum[];
  measurementChartData: MeasurementChartDatum[];
  adherenceStats: AdherenceStats;
}

export default function ProgressCharts({
  weightChartData,
  adherenceStats,
}: ProgressChartsProps) {
  const t = useTranslations("progress");
  const locale = useLocale();

  return (
    <div className="space-y-4">
      {/* Weight Chart */}
      <SectionCard icon={Weight} title={t("weightTrend")} description={t("weightTrendDescription")}>
        {weightChartData.length > 0 ? (
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weightChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.foreground} strokeOpacity={0.08} />
                <XAxis dataKey="date" stroke={CHART_COLORS.foreground} fontSize={12} tickLine={false} />
                <YAxis stroke={CHART_COLORS.foreground} fontSize={12} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: CHART_COLORS.background,
                    border: `1px solid #e5e5e5`,
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2.5}
                  dot={{ fill: CHART_COLORS.primary, r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[300px] items-center justify-center rounded-lg border-2 border-dashed border-border">
            <div className="text-center">
              <Weight className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 font-medium text-sm">{t("noWeightData")}</p>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Adherence Stats */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="p-4 border-b border-border bg-success-500/5">
            <h3 className="font-semibold text-sm">{t("mealAdherence")}</h3>
          </div>
          <div className="p-5">
            <p className="text-4xl font-bold">{adherenceStats.mealAdherence.toFixed(0)}%</p>
            <div className="mt-3 h-2 rounded-full bg-neutral-100 overflow-hidden" dir={locale === "ar" ? "rtl" : "ltr"}>
              <div
                className="h-full bg-success-500 rounded-full transition-all"
                style={{
                  width: `${adherenceStats.mealAdherence}%`,
                  marginInlineStart: 0,
                  marginInlineEnd: "auto"
                }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm">{t("workoutAdherence")}</h3>
          </div>
          <div className="p-5">
            <p className="text-4xl font-bold">{adherenceStats.workoutAdherence.toFixed(0)}%</p>
            <div className="mt-3 h-2 rounded-full bg-neutral-100 overflow-hidden" dir={locale === "ar" ? "rtl" : "ltr"}>
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{
                  width: `${adherenceStats.workoutAdherence}%`,
                  marginInlineStart: 0,
                  marginInlineEnd: "auto"
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
