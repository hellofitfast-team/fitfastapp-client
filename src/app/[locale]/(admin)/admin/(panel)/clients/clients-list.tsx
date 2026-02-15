"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Users, Search, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Client {
  id: string;
  full_name: string | null;
  phone: string | null;
  status: string | null;
  plan_tier: string | null;
  plan_start_date: string | null;
  plan_end_date: string | null;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending_approval: "bg-primary/10 text-primary border-primary/20",
  inactive: "bg-stone-100 text-stone-500 border-stone-200",
  expired: "bg-red-50 text-red-700 border-red-200",
};

const tierLabels: Record<string, string> = {
  "3_months": "3 Mo",
  "6_months": "6 Mo",
  "12_months": "12 Mo",
};

export function ClientsList({ clients }: { clients: Client[] }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [search, setSearch] = useState("");

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.full_name?.toLowerCase().includes(q) ?? false) ||
      (c.phone?.includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <input
          type="text"
          placeholder={t("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-11 ps-10 pe-4 rounded-xl border border-stone-200 bg-white text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-stone-300 mb-4" />
          <p className="font-medium text-stone-500">
            {t("noResults")}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/50">
                <th className="px-4 py-3 text-start text-xs font-medium text-stone-500 uppercase tracking-wide">
                  {t("client")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-stone-500 uppercase tracking-wide">
                  {t("plan")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-stone-500 uppercase tracking-wide">
                  {t("status")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-stone-500 uppercase tracking-wide">
                  {t("date")}
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-stone-100 last:border-0 hover:bg-stone-50/50 transition-colors"
                >
                  <td className="px-4 py-4">
                    <p className="font-medium text-sm text-stone-900">
                      {client.full_name ?? "—"}
                    </p>
                    {client.phone && (
                      <p className="text-xs text-stone-400">
                        {client.phone}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs font-semibold text-primary">
                      {client.plan_tier
                        ? tierLabels[client.plan_tier] || client.plan_tier
                        : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-1 text-xs font-medium ${
                        statusStyles[client.status ?? ""] ?? statusStyles.inactive
                      }`}
                    >
                      {client.status?.replace("_", " ") ?? "unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-stone-500">
                    {client.plan_end_date
                      ? formatDate(client.plan_end_date, locale)
                      : "—"}
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/admin/clients/${client.id}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:border-primary/30 hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
