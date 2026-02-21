"use client";

import { useTranslations } from "next-intl";
import { SignupsTable } from "./signups-table";

export default function AdminSignupsPage() {
  const t = useTranslations("admin");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          {t("signups")}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {t("pendingSignups")}
        </p>
      </div>

      <SignupsTable />
    </div>
  );
}
