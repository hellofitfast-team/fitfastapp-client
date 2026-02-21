"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@fitfast/i18n/navigation";
import {
  Home,
  UtensilsCrossed,
  Dumbbell,
  ClipboardCheck,
  CalendarCheck,
  TrendingUp,
  MessageSquare,
  HelpCircle,
  Settings,
  X,
  LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@fitfast/ui/cn";

function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 rounded-lg mx-2 px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-neutral-100 hover:text-foreground"
        )}
      >
        <Icon className="h-4.5 w-4.5 shrink-0" />
        {label}
      </Link>
    </li>
  );
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { href: "/", icon: Home, labelKey: "nav.dashboard" },
  { href: "/meal-plan", icon: UtensilsCrossed, labelKey: "nav.mealPlan" },
  { href: "/workout-plan", icon: Dumbbell, labelKey: "nav.workoutPlan" },
  { href: "/check-in", icon: ClipboardCheck, labelKey: "nav.checkIn" },
  { href: "/tracking", icon: CalendarCheck, labelKey: "nav.tracking" },
  { href: "/progress", icon: TrendingUp, labelKey: "nav.progress" },
  { href: "/tickets", icon: MessageSquare, labelKey: "nav.tickets" },
  { href: "/faq", icon: HelpCircle, labelKey: "nav.faq" },
  { href: "/settings", icon: Settings, labelKey: "nav.settings" },
];

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const t = useTranslations();
  const tBrand = useTranslations("brand");
  const pathname = usePathname();

  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, "") || "/";

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

      {/* Sidebar */}
      <aside
        className={cn(
          "flex w-64 flex-col border-e border-border bg-card transition-transform duration-300",
          "fixed inset-y-0 start-0 z-50",
          "lg:relative lg:z-auto lg:shrink-0",
          isOpen
            ? "translate-x-0"
            : "-translate-x-full rtl:translate-x-full lg:translate-x-0 lg:rtl:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/icons/icon-512x512.png"
              alt="FitFast"
              width={32}
              height={32}
              className="h-8 w-8 rounded"
            />
            <span className="font-bold text-lg tracking-tight">
              {tBrand("name")}
            </span>
          </div>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-neutral-100 transition-colors lg:hidden"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive =
                pathWithoutLocale === item.href ||
                (item.href !== "/" && pathWithoutLocale.startsWith(item.href));

              return (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={t(item.labelKey)}
                  isActive={isActive}
                  onClick={onClose}
                />
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <p className="text-xs text-muted-foreground">
            {tBrand("name")} v1.0.0
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {tBrand("tagline")}
          </p>
        </div>
      </aside>
    </>
  );
}
