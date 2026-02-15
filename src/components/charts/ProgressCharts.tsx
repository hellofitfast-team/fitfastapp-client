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

// Theme colors for charts - must match globals.css
const CHART_COLORS = {
  primary: "#4169E1",      // --color-primary (Royal Blue)
  cream: "#FFFEF5",        // --color-cream
  black: "#000000",        // --color-black
  success: "#00FF94",      // --color-success-500
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
    <div className="space-y-6">
      {/* Weight Chart */}
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-primary p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-black">
            <Weight className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-black text-xl text-white tracking-tight">
              {t("weightTrend").toUpperCase()}
            </h2>
            <p className="font-mono text-xs text-white/80">{t("weightTrendDescription").toUpperCase()}</p>
          </div>
        </div>
        <div className="p-6">
          {weightChartData.length > 0 ? (
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weightChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.black} strokeOpacity={0.1} />
                  <XAxis dataKey="date" stroke={CHART_COLORS.black} fontSize={12} tickLine={false} />
                  <YAxis stroke={CHART_COLORS.black} fontSize={12} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: CHART_COLORS.cream,
                      border: `4px solid ${CHART_COLORS.black}`,
                      borderRadius: "0",
                      fontWeight: "bold",
                    }}
                  />
                  <Line type="monotone" dataKey="weight" stroke={CHART_COLORS.primary} strokeWidth={4} dot={{ fill: CHART_COLORS.primary, r: 6, strokeWidth: 2, stroke: CHART_COLORS.black }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center border-4 border-dashed border-black">
              <div className="text-center">
                <Weight className="mx-auto h-12 w-12 text-neutral-300" />
                <p className="mt-4 font-black">{t("noWeightData").toUpperCase()}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Adherence Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="border-b-4 border-black bg-success-500 p-4">
            <h3 className="font-black text-lg text-black">{t("mealAdherence").toUpperCase()}</h3>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-5xl font-black">{adherenceStats.mealAdherence.toFixed(0)}%</span>
            </div>
            <div className="h-6 border-4 border-black bg-neutral-100" dir={locale === "ar" ? "rtl" : "ltr"}>
              <div
                className="h-full bg-success-500 transition-all"
                style={{
                  width: `${adherenceStats.mealAdherence}%`,
                  marginInlineStart: 0,
                  marginInlineEnd: "auto"
                }}
              />
            </div>
          </div>
        </div>

        <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="border-b-4 border-black bg-black p-4">
            <h3 className="font-black text-lg text-cream">{t("workoutAdherence").toUpperCase()}</h3>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-5xl font-black">{adherenceStats.workoutAdherence.toFixed(0)}%</span>
            </div>
            <div className="h-6 border-4 border-black bg-neutral-100" dir={locale === "ar" ? "rtl" : "ltr"}>
              <div
                className="h-full bg-primary transition-all"
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
