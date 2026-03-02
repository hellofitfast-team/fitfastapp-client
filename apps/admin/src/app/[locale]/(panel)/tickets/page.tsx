"use client";

import { useTranslations } from "next-intl";
import { TicketsList } from "./tickets-list";

export default function AdminTicketsPage() {
  const t = useTranslations("admin");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">{t("openTickets")}</h1>
        <p className="mt-1 text-sm text-stone-500">{t("manageTickets")}</p>
      </div>

      <TicketsList />
    </div>
  );
}
