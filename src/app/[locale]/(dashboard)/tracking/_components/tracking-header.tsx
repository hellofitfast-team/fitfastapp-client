"use client";

import { useTranslations } from "next-intl";
import { Target } from "lucide-react";

export function TrackingHeader() {
  const t = useTranslations("tracking");

  return (
    <div className="border-4 border-black bg-black p-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center bg-primary">
          <Target className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-cream tracking-tight">
            {t("title").toUpperCase()}
          </h1>
          <p className="font-mono text-xs tracking-[0.2em] text-primary">
            {t("subtitle").toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
}
