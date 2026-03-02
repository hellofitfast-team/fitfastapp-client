"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTranslations, useLocale } from "next-intl";
import {
  Users,
  UserPlus,
  MessageSquare,
  TrendingUp,
  ArrowRight,
  Loader2,
  Activity,
} from "lucide-react";
import { Link } from "@fitfast/i18n/navigation";
import { Card, CardHeader, CardContent } from "@fitfast/ui/card";
import gsap from "gsap";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/**
 * Chart color constants for Recharts (SVG fills don't support CSS custom properties).
 * Each value maps to a design token — update both if the theme changes.
 */
const CHART_COLORS = {
  primary: "#FF4500" /* --color-primary */,
  secondary: "#FF6633" /* --color-primary-light */,
  success: "#22c55e" /* --color-success / emerald-500 */,
  warning: "#f59e0b" /* --color-warning / amber-500 */,
  muted: "#e5e5e5" /* --color-muted / stone-200 */,
  axis: "#a3a3a3" /* stone-400 */,
  tooltipBorder: "#e5e5e5" /* stone-200 */,
};

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
  const t = useTranslations("admin");
  return (
    <Link
      href={href}
      className={`stat-card group rounded-xl border p-5 transition-all hover:shadow-md ${
        accent
          ? "border-red-200 bg-red-50 hover:border-red-300"
          : "border-stone-200 bg-white hover:border-stone-300"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">{label}</p>
          <p className={`mt-2 text-3xl font-bold ${accent ? "text-red-600" : "text-stone-900"}`}>
            {value}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            accent ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="group-hover:text-primary mt-3 flex items-center gap-1 text-xs font-medium text-stone-400 transition-colors">
        {t("view")} <ArrowRight className="h-3 w-3 rtl:rotate-180" />
      </div>
    </Link>
  );
}

function ClientGrowthChart({
  clients,
}: {
  clients: Array<{ _creationTime: number; status?: string }>;
}) {
  const t = useTranslations("admin");
  const locale = useLocale();

  const [now] = useState(() => Date.now());
  const chartData = useMemo(() => {
    const months: { name: string; clients: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();

      const count = clients.filter(
        (c) => c._creationTime >= monthStart && c._creationTime <= monthEnd,
      ).length;

      months.push({
        name: d.toLocaleDateString(locale, { month: "short" }),
        clients: count,
      });
    }
    return months;
  }, [clients, locale, now]);

  return (
    <Card className="chart-section">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <h2
            className="font-semibold text-stone-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("clientGrowth") || "Client Growth"}
          </h2>
          <p className="mt-0.5 text-xs text-stone-500">{t("lastSixMonths") || "Last 6 months"}</p>
        </div>
        <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
          <TrendingUp className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.15} />
                <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.muted} />
            <XAxis
              dataKey="name"
              stroke={CHART_COLORS.axis}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={CHART_COLORS.axis}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: `1px solid ${CHART_COLORS.tooltipBorder}`,
                borderRadius: "12px",
                fontSize: "13px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            />
            <Area
              type="monotone"
              dataKey="clients"
              stroke={CHART_COLORS.primary}
              strokeWidth={2.5}
              fill="url(#colorClients)"
              dot={{ fill: CHART_COLORS.primary, r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ActivityChart({
  signups,
  tickets,
}: {
  signups: Array<{ _creationTime: number; status?: string }>;
  tickets: Array<{ _creationTime: number; status?: string }>;
}) {
  const t = useTranslations("admin");

  const [now] = useState(() => Date.now());
  const chartData = useMemo(() => {
    const weeks: { name: string; signups: number; tickets: number }[] = [];

    for (let i = 3; i >= 0; i--) {
      const weekStart = now - (i + 1) * 7 * 24 * 60 * 60 * 1000;
      const weekEnd = now - i * 7 * 24 * 60 * 60 * 1000;

      weeks.push({
        name: `W${4 - i}`,
        signups: signups.filter((s) => s._creationTime >= weekStart && s._creationTime < weekEnd)
          .length,
        tickets: tickets.filter((t) => t._creationTime >= weekStart && t._creationTime < weekEnd)
          .length,
      });
    }
    return weeks;
  }, [signups, tickets, now]);

  return (
    <Card className="chart-section">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <h2
            className="font-semibold text-stone-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("weeklyActivity") || "Weekly Activity"}
          </h2>
          <p className="mt-0.5 text-xs text-stone-500">{t("lastFourWeeks") || "Last 4 weeks"}</p>
        </div>
        <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
          <Activity className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.muted} />
            <XAxis
              dataKey="name"
              stroke={CHART_COLORS.axis}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={CHART_COLORS.axis}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: `1px solid ${CHART_COLORS.tooltipBorder}`,
                borderRadius: "12px",
                fontSize: "13px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            />
            <Bar
              dataKey="signups"
              fill={CHART_COLORS.primary}
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
              name={t("signups")}
            />
            <Bar
              dataKey="tickets"
              fill={CHART_COLORS.secondary}
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
              name={t("openTickets")}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span className="bg-primary h-2.5 w-2.5 rounded-full" />
            {t("signups")}
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CHART_COLORS.secondary }}
            />
            {t("openTickets")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const t = useTranslations("admin");
  const containerRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useConvexAuth();

  const clients = useQuery(api.profiles.getAllClients, isAuthenticated ? {} : "skip");
  const signups = useQuery(api.pendingSignups.getAllSignups, isAuthenticated ? {} : "skip");
  const tickets = useQuery(api.tickets.getAllTickets, isAuthenticated ? {} : "skip");

  const isLoading = clients === undefined || signups === undefined || tickets === undefined;

  // GSAP entrance animations
  useEffect(() => {
    if (isLoading || !containerRef.current) return;

    const ctx = gsap.context(() => {
      // Animate page title
      gsap.fromTo(
        ".page-title",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" },
      );

      // Stagger stat cards
      gsap.fromTo(
        ".stat-card",
        { y: 40, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: "power3.out",
          delay: 0.15,
        },
      );

      // Charts fade in
      gsap.fromTo(
        ".chart-section",
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.15,
          ease: "power3.out",
          delay: 0.4,
        },
      );

      // Quick action cards
      gsap.fromTo(
        ".quick-action",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: "power3.out",
          delay: 0.6,
        },
      );
    }, containerRef);

    return () => ctx.revert();
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "active").length;
  const pendingSignupsCount = signups.filter((s) => s.status === "pending").length;
  const openTicketsCount = tickets.filter((t) => t.status === "open").length;

  return (
    <div ref={containerRef} className="space-y-8">
      {/* Page title */}
      <div className="page-title">
        <h1
          className="text-2xl font-bold tracking-tight text-stone-900"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("dashboard")}
        </h1>
        <p className="mt-1 text-sm text-stone-500">{t("overview")}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("totalClients")} value={totalClients} icon={Users} href="/clients" />
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

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ClientGrowthChart clients={clients} />
        <ActivityChart signups={signups} tickets={tickets} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pending signups preview */}
        <Card className="quick-action">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <h2 className="font-semibold text-stone-900">{t("pendingSignups")}</h2>
            <Link
              href="/signups"
              className="link-lift text-primary hover:text-primary text-xs font-medium transition-colors"
            >
              {t("viewAll")}
            </Link>
          </CardHeader>
          <CardContent>
            {pendingSignupsCount === 0 ? (
              <p className="text-sm text-stone-400">{t("noActivity")}</p>
            ) : (
              <p className="text-sm font-medium text-red-600">
                {pendingSignupsCount} {t("pendingSignups").toLowerCase()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Open tickets preview */}
        <Card className="quick-action">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <h2 className="font-semibold text-stone-900">{t("openTickets")}</h2>
            <Link
              href="/tickets"
              className="link-lift text-primary hover:text-primary text-xs font-medium transition-colors"
            >
              {t("viewAll")}
            </Link>
          </CardHeader>
          <CardContent>
            {openTicketsCount === 0 ? (
              <p className="text-sm text-stone-400">{t("noActivity")}</p>
            ) : (
              <p className="text-sm font-medium text-red-600">
                {openTicketsCount} {t("openTickets").toLowerCase()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
