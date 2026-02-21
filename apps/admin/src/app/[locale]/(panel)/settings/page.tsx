"use client";

import { useTranslations } from "next-intl";
import { AdminSettingsForm } from "./settings-form";

export default function AdminSettingsPage() {
  const t = useTranslations("admin");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          {t("settingsPage")}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          System configuration
        </p>
      </div>

      <AdminSettingsForm />
    </div>
  );
}
