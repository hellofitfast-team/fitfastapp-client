"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTranslations } from "next-intl";
import { ClientsList } from "./clients-list";
import { Loader2 } from "lucide-react";

export default function AdminClientsPage() {
  const t = useTranslations("admin");
  const clients = useQuery(api.profiles.getAllClients);

  const isLoading = clients === undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Adapt client data for the ClientsList component
  const adaptedClients = clients.map((c) => ({
    id: c._id,
    fullName: c.fullName ?? null,
    phone: c.phone ?? null,
    status: c.status ?? null,
    planTier: c.planTier ?? null,
    planStartDate: c.planStartDate ?? null,
    planEndDate: c.planEndDate ?? null,
    createdAt: new Date(c._creationTime).toISOString(),
    userId: c.userId,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          {t("clients")}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {clients.length} {t("totalClients").toLowerCase()}
        </p>
      </div>

      <ClientsList clients={adaptedClients} />
    </div>
  );
}
