"use client";

import { useTranslations } from "next-intl";
import { Button } from "@fitfast/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";

export function Hero() {
  const t = useTranslations("landing");

  return (
    <section className="relative min-h-screen flex flex-col bg-[var(--color-primary)] overflow-hidden">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-[var(--color-primary)]/95 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <span className="text-sm font-bold text-white">FF</span>
          </div>
          <span className="text-lg font-bold text-white tracking-tight">FitFast</span>
        </div>
        <LanguageSwitcher />
      </header>

      {/* Hero content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/20 mb-6">
          <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
          <span className="text-sm font-medium text-white/90">{t("heroBadge")}</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white max-w-3xl leading-tight mb-4">
          {t("heroTitle")}
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-white/80 max-w-xl mb-8 leading-relaxed">
          {t("heroSubtitle")}
        </p>

        {/* CTA */}
        <a href="#pricing">
          <Button
            size="lg"
            className="bg-white text-[var(--color-primary)] hover:bg-white/90 font-semibold px-8 py-3 text-base shadow-lg"
          >
            {t("heroCta")}
          </Button>
        </a>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-10 text-white/60 text-sm">
          <span>✓ {t("trustNoSetup")}</span>
          <span>✓ {t("trustBilingual")}</span>
          <span>✓ {t("trustAI")}</span>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-[var(--color-background)] rounded-t-[3rem]" />
    </section>
  );
}
