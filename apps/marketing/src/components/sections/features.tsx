"use client";

import { useTranslations } from "next-intl";
import { Brain, CheckCircle2, MessageCircle } from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    titleKey: "feature1Title",
    descKey: "feature1Desc",
    color: "text-[var(--color-primary)]",
    bg: "bg-[var(--color-primary)]/10",
  },
  {
    icon: CheckCircle2,
    titleKey: "feature2Title",
    descKey: "feature2Desc",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: MessageCircle,
    titleKey: "feature3Title",
    descKey: "feature3Desc",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
] as const;

export function Features() {
  const t = useTranslations("landing");

  return (
    <section className="py-16 px-4 bg-[var(--color-background)]">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-foreground)] mb-3">
            {t("featuresTitle")}
          </h2>
          <p className="text-[var(--color-muted-foreground)] text-base sm:text-lg max-w-xl mx-auto">
            {t("featuresSubtitle")}
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, titleKey, descKey, color, bg }) => (
            <div
              key={titleKey}
              className="flex flex-col items-start p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">
                {t(titleKey)}
              </h3>
              <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
                {t(descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
