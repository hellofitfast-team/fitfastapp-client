"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTranslations } from "next-intl";
import {
  Users,
  UserPlus,
  MessageSquare,
  TrendingUp,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Link } from "@fitfast/i18n/navigation";

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  accent = false,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-xl border p-5 transition-all hover:shadow-md ${
        accent
          ? "border-red-200 bg-red-50 hover:border-red-300"
          : "border-stone-200 bg-white hover:border-stone-300"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
            {label}
          </p>
          <p
            className={`mt-2 text-3xl font-bold ${
              accent ? "text-red-600" : "text-stone-900"
            }`}
          >
            {value}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            accent
              ? "bg-red-100 text-red-600"
              : "bg-primary/10 text-primary"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs font-medium text-stone-400 group-hover:text-primary transition-colors">
        View <ArrowRight className="h-3 w-3 rtl:rotate-180" />
      </div>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const t = useTranslations("admin");

  const clients = useQuery(api.profiles.getAllClients);
  const signups = useQuery(api.pendingSignups.getAllSignups);
  const tickets = useQuery(api.tickets.getAllTickets);

  const isLoading = clients === undefined || signups === undefined || tickets === undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "active").length;
  const pendingSignupsCount = signups.filter((s) => s.status === "pending").length;
  const openTicketsCount = tickets.filter((t) => t.status === "open").length;

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          {t("dashboard")}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {t("overview")}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("totalClients")}
          value={totalClients}
          icon={Users}
          href="/clients"
        />
        <StatCard
          label={t("activeClients")}
          value={activeClients}
          icon={TrendingUp}
          href="/clients"
        />
        <StatCard
          label={t("pendingSignups")}
          value={pendingSignupsCount}
          icon={UserPlus}
          href="/signups"
          accent={pendingSignupsCount > 0}
        />
        <StatCard
          label={t("openTickets")}
          value={openTicketsCount}
          icon={MessageSquare}
          href="/tickets"
          accent={openTicketsCount > 0}
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pending signups preview */}
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-900">
              {t("pendingSignups")}
            </h2>
            <Link
              href="/signups"
              className="text-xs font-medium text-primary hover:text-primary transition-colors"
            >
              {t("viewAll")}
            </Link>
          </div>
          {pendingSignupsCount === 0 ? (
            <p className="text-sm text-stone-400">
              {t("noActivity")}
            </p>
          ) : (
            <p className="text-sm font-medium text-red-600">
              {pendingSignupsCount} {t("pendingSignups").toLowerCase()}
            </p>
          )}
        </div>

        {/* Open tickets preview */}
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-900">
              {t("openTickets")}
            </h2>
            <Link
              href="/tickets"
              className="text-xs font-medium text-primary hover:text-primary transition-colors"
            >
              {t("viewAll")}
            </Link>
          </div>
          {openTicketsCount === 0 ? (
            <p className="text-sm text-stone-400">
              {t("noActivity")}
            </p>
          ) : (
            <p className="text-sm font-medium text-red-600">
              {openTicketsCount} {t("openTickets").toLowerCase()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
