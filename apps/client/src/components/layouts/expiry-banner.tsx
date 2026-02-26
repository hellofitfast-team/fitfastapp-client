"use client";

import { useTranslations } from "next-intl";
import { Link } from "@fitfast/i18n/navigation";
import { AlertTriangle } from "lucide-react";

interface ExpiryBannerProps {
  daysUntilExpiry: number;
}

export function ExpiryBanner({ daysUntilExpiry }: ExpiryBannerProps) {
  const t = useTranslations("subscription.banner");

  const message =
    daysUntilExpiry <= 1 ? t("expiresInOne") : t("expiresIn", { days: daysUntilExpiry });

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
      <Link
        href="/expired"
        className="underline underline-offset-2 font-bold hover:text-white/90 transition-colors"
      >
        {t("renewNow")}
      </Link>
    </div>
  );
}
