"use client";

import { useTranslations } from "next-intl";
import { Users, Cpu, Globe } from "lucide-react";

const METRICS = [
  { icon: Users, labelKey: "metric1Label", valueKey: "metric1Value" },
  { icon: Cpu,   labelKey: "metric2Label", valueKey: "metric2Value" },
  { icon: Globe, labelKey: "metric3Label", valueKey: "metric3Value" },
] as const;

export function Testimonials() {
  const t = useTranslations("landing");

  return (
    <section className="py-16 px-4 bg-[var(--color-primary)]/5">
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-foreground)] mb-3">
            {t("trustTitle")}
          </h2>
          <p className="text-[var(--color-muted-foreground)] text-base sm:text-lg max-w-xl mx-auto">
            {t("trustSubtitle")}
          </p>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {METRICS.map(({ icon: Icon, labelKey, valueKey }) => (
            <div
              key={valueKey}
              className="flex flex-col items-center text-center p-8 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm"
            >
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center mb-4">
                <Icon className="w-7 h-7 text-[var(--color-primary)]" />
              </div>
              <p className="text-3xl font-bold text-[var(--color-primary)] mb-1">
                {t(valueKey)}
              </p>
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                {t(labelKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
