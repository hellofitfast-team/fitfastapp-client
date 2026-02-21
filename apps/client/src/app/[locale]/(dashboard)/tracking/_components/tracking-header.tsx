"use client";

import { useTranslations } from "next-intl";

export function TrackingHeader() {
  const t = useTranslations("tracking");

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
    </div>
  );
}
