"use client";

import { useTranslations } from "next-intl";
import { FaqManager } from "./faq-manager";

export default function AdminFaqsPage() {
  const t = useTranslations("admin");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          {t("faqs")}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Manage frequently asked questions
        </p>
      </div>

      <FaqManager />
    </div>
  );
}
