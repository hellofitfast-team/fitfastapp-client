"use client";

import { useTranslations } from "next-intl";
import { KnowledgeManager } from "./knowledge-manager";

export default function KnowledgePage() {
  const t = useTranslations("knowledge");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-stone-500 mt-1">{t("description")}</p>
      </div>
      <KnowledgeManager />
    </div>
  );
}
