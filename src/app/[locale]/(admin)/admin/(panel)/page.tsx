import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import {
  Users,
  UserPlus,
  MessageSquare,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Link } from "@/i18n/navigation";

async function getStats() {
  const supabase = await createClient();

  const [totalClients, activeClients, pendingSignups, openTickets, recentCheckins] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_coach", false),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_coach", false)
        .eq("status", "active"),
      supabase
        .from("pending_signups")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      supabase
        .from("check_ins")
        .select("id,user_id,created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  return {
    totalClients: totalClients.count ?? 0,
    activeClients: activeClients.count ?? 0,
    pendingSignups: pendingSignups.count ?? 0,
    openTickets: openTickets.count ?? 0,
    recentCheckins: recentCheckins.data ?? [],
  };
}

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
        View <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const t = await getTranslations("admin");
  const stats = await getStats();

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
          value={stats.totalClients}
          icon={Users}
          href="/admin/clients"
        />
        <StatCard
          label={t("activeClients")}
          value={stats.activeClients}
          icon={TrendingUp}
          href="/admin/clients"
        />
        <StatCard
          label={t("pendingSignups")}
          value={stats.pendingSignups}
          icon={UserPlus}
          href="/admin/signups"
          accent={stats.pendingSignups > 0}
        />
        <StatCard
          label={t("openTickets")}
          value={stats.openTickets}
          icon={MessageSquare}
          href="/admin/tickets"
          accent={stats.openTickets > 0}
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
              href="/admin/signups"
              className="text-xs font-medium text-primary hover:text-primary transition-colors"
            >
              {t("viewAll")}
            </Link>
          </div>
          {stats.pendingSignups === 0 ? (
            <p className="text-sm text-stone-400">
              {t("noActivity")}
            </p>
          ) : (
            <p className="text-sm font-medium text-red-600">
              {stats.pendingSignups} {t("pendingSignups").toLowerCase()}
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
              href="/admin/tickets"
              className="text-xs font-medium text-primary hover:text-primary transition-colors"
            >
              {t("viewAll")}
            </Link>
          </div>
          {stats.openTickets === 0 ? (
            <p className="text-sm text-stone-400">
              {t("noActivity")}
            </p>
          ) : (
            <p className="text-sm font-medium text-red-600">
              {stats.openTickets} {t("openTickets").toLowerCase()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
