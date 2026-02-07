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
import { useTranslations } from "next-intl";

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

  return (
    <div className="space-y-6">
      {/* Weight Chart */}
      <div className="border-4 border-black bg-[#FFFEF5] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-[#FF3B00] p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-black">
            <Weight className="h-5 w-5 text-[#FF3B00]" />
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
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weightChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.1} />
                <XAxis dataKey="date" stroke="#000" fontSize={12} tickLine={false} />
                <YAxis stroke="#000" fontSize={12} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFEF5",
                    border: "4px solid #000",
                    borderRadius: "0",
                    fontWeight: "bold",
                  }}
                />
                <Line type="monotone" dataKey="weight" stroke="#FF3B00" strokeWidth={4} dot={{ fill: "#FF3B00", r: 6, strokeWidth: 2, stroke: "#000" }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
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
        <div className="border-4 border-black bg-[#FFFEF5] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="border-b-4 border-black bg-[#00FF94] p-4">
            <h3 className="font-black text-lg text-black">{t("mealAdherence").toUpperCase()}</h3>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-5xl font-black">{adherenceStats.mealAdherence.toFixed(0)}%</span>
            </div>
            <div className="h-6 border-4 border-black bg-neutral-100">
              <div className="h-full bg-[#00FF94] transition-all" style={{ width: `${adherenceStats.mealAdherence}%` }} />
            </div>
          </div>
        </div>

        <div className="border-4 border-black bg-[#FFFEF5] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="border-b-4 border-black bg-black p-4">
            <h3 className="font-black text-lg text-[#FFFEF5]">{t("workoutAdherence").toUpperCase()}</h3>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-5xl font-black">{adherenceStats.workoutAdherence.toFixed(0)}%</span>
            </div>
            <div className="h-6 border-4 border-black bg-neutral-100">
              <div className="h-full bg-[#FF3B00] transition-all" style={{ width: `${adherenceStats.workoutAdherence}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
