"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  MessageSquare,
  HelpCircle,
  Settings,
  X,
  Dumbbell,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
  badge,
  onClick,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 rounded-lg mx-3 px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-amber-600/10 text-amber-500"
            : "text-stone-400 hover:bg-white/5 hover:text-stone-200"
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
            {badge}
          </span>
        )}
      </Link>
    </li>
  );
}

const adminNavItems = [
  { href: "/admin", icon: LayoutDashboard, labelKey: "adminNav.dashboard" },
  { href: "/admin/signups", icon: UserPlus, labelKey: "adminNav.signups" },
  { href: "/admin/clients", icon: Users, labelKey: "adminNav.clients" },
  { href: "/admin/tickets", icon: MessageSquare, labelKey: "adminNav.tickets" },
  { href: "/admin/faqs", icon: HelpCircle, labelKey: "adminNav.faqs" },
  { href: "/admin/settings", icon: Settings, labelKey: "adminNav.settings" },
];

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  pendingSignups?: number;
  openTickets?: number;
}

export function AdminSidebar({
  isOpen = false,
  onClose,
  pendingSignups = 0,
  openTickets = 0,
}: AdminSidebarProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, "") || "/admin";

  const badges: Record<string, number> = {
    "/admin/signups": pendingSignups,
    "/admin/tickets": openTickets,
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "flex w-64 flex-col bg-stone-900 transition-transform duration-300",
          "fixed inset-y-0 start-0 z-50",
          "lg:relative lg:z-auto lg:shrink-0",
          isOpen
            ? "translate-x-0"
            : "-translate-x-full rtl:translate-x-full lg:translate-x-0 lg:rtl:translate-x-0"
        )}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600">
              <Dumbbell className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-[15px] font-bold tracking-tight text-white">
                FitFast
              </span>
              <p className="text-[10px] font-medium text-stone-500 -mt-0.5">
                Coach Panel
              </p>
            </div>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-white/5 hover:text-stone-300 transition-colors lg:hidden"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {adminNavItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathWithoutLocale === "/admin"
                  : pathWithoutLocale.startsWith(item.href);

              return (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={t(item.labelKey)}
                  isActive={isActive}
                  badge={badges[item.href]}
                  onClick={onClose}
                />
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-white/5 px-5 py-4">
          <p className="text-[10px] font-medium text-stone-600">
            FitFast Coach Panel v1.0
          </p>
        </div>
      </aside>
    </>
  );
}
