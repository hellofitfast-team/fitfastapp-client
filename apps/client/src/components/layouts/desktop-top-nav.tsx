"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter, usePathname as useI18nPathname } from "@fitfast/i18n/navigation";
import { usePathname } from "next/navigation";
import { useParams } from "next/navigation";
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
  Bell,
  User,
  LogOut,
  LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@fitfast/ui/dropdown-menu";
import { cn } from "@fitfast/ui/cn";
import { useAuthActions } from "@convex-dev/auth/react";
import Image from "next/image";
import { useNavBadges } from "@/hooks/useNavBadges";

interface NavItemConfig {
  href: string;
  icon: LucideIcon;
  labelKey: string;
}

const NAV_ITEMS: NavItemConfig[] = [
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

function NavLink({
  href,
  icon: Icon,
  label,
  isActive,
  badge,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  badge?: "dot" | number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-neutral-100",
      )}
    >
      <span className="relative">
        <Icon className="h-4 w-4 shrink-0" />
        {badge === "dot" && (
          <span className="bg-error-500 absolute -end-0.5 -top-0.5 h-2 w-2 rounded-full" />
        )}
        {typeof badge === "number" && badge > 0 && (
          <span className="bg-error-500 absolute -end-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[10px] font-bold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span className="hidden xl:inline">{label}</span>
    </Link>
  );
}

interface DesktopTopNavProps {
  userName?: string;
}

export function DesktopTopNav({ userName }: DesktopTopNavProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname(); // next/navigation — includes locale prefix (for active-state matching)
  const i18nPathname = useI18nPathname(); // next-intl — locale-free (for locale switching)
  const params = useParams();
  const currentLocale = params.locale as string;
  const { signOut } = useAuthActions();
  const { checkInDue, unreadTicketCount } = useNavBadges();
  const menuId = useId();

  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, "") || "/";

  const switchLocale = () => {
    const newLocale = currentLocale === "en" ? "ar" : "en";
    router.replace(i18nPathname, { locale: newLocale });
  };

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  const getBadgeForItem = (href: string): "dot" | number | undefined => {
    if (href === "/check-in" && checkInDue) return "dot";
    if (href === "/tickets" && unreadTicketCount > 0) return unreadTicketCount;
    return undefined;
  };

  return (
    <nav className="border-border bg-card hidden h-[var(--height-desktop-nav)] items-center justify-between border-b px-4 lg:flex">
      {/* Left: Logo + Nav Links */}
      <div className="flex items-center gap-1">
        <Link href="/" className="me-4 flex items-center gap-2">
          <Image src="/logo.svg" alt="FitFast" width={32} height={32} className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight">FitFast</span>
        </Link>

        {NAV_ITEMS.map((item) => {
          const isActive =
            pathWithoutLocale === item.href ||
            (item.href !== "/" && pathWithoutLocale.startsWith(item.href));

          return (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={t(item.labelKey)}
              isActive={isActive}
              badge={getBadgeForItem(item.href)}
            />
          );
        })}
      </div>

      {/* Right: Lang switch, notifications, user menu */}
      <div className="flex items-center gap-1.5">
        {/* Language Switcher */}
        <button
          className="text-muted-foreground hover:text-foreground flex h-11 w-11 items-center justify-center rounded-lg text-xs font-semibold transition-colors hover:bg-neutral-100"
          onClick={switchLocale}
          aria-label="Switch language"
        >
          {currentLocale === "en" ? "AR" : "EN"}
        </button>

        {/* Notifications */}
        <button
          className="text-muted-foreground hover:text-foreground flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-neutral-100"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              id={`desktop-user-menu-${menuId}`}
              className="text-muted-foreground hover:text-foreground flex h-11 items-center gap-2 rounded-lg px-3 transition-colors hover:bg-neutral-100"
              aria-label="User menu"
            >
              <User className="h-4 w-4" />
              {userName && <span className="text-sm font-medium">{userName}</span>}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex cursor-pointer items-center gap-2">
                <Settings className="h-4 w-4" />
                {t("nav.settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-error-500 focus:text-error-500 flex cursor-pointer items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              {t("auth.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
