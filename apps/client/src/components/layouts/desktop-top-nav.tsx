"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link, useRouter } from "@fitfast/i18n/navigation";
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
import { useClerk } from "@clerk/nextjs";
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
        "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors min-h-11",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-neutral-100 hover:text-foreground"
      )}
    >
      <span className="relative">
        <Icon className="h-4 w-4 shrink-0" />
        {badge === "dot" && (
          <span className="absolute -top-0.5 -end-0.5 h-2 w-2 rounded-full bg-error-500" />
        )}
        {typeof badge === "number" && badge > 0 && (
          <span className="absolute -top-1 -end-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-500 text-[10px] font-bold text-white px-0.5">
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
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = params.locale as string;
  const { signOut } = useClerk();
  const { checkInDue, unreadTicketCount } = useNavBadges();

  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, "") || "/";

  const switchLocale = () => {
    const newLocale = currentLocale === "en" ? "ar" : "en";
    router.replace(pathname, { locale: newLocale });
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
    <nav className="hidden lg:flex h-[var(--height-desktop-nav)] border-b border-border bg-card items-center justify-between px-4">
      {/* Left: Logo + Nav Links */}
      <div className="flex items-center gap-1">
        <Link href="/" className="flex items-center gap-2 me-4">
          <Image
            src="/icons/icon-512x512.png"
            alt="FitFast"
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <span className="font-bold text-lg tracking-tight">FitFast</span>
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
          className="flex h-11 w-11 items-center justify-center rounded-lg text-xs font-semibold text-muted-foreground hover:bg-neutral-100 hover:text-foreground transition-colors"
          onClick={switchLocale}
          aria-label="Switch language"
        >
          {currentLocale === "en" ? "AR" : "EN"}
        </button>

        {/* Notifications */}
        <button
          className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-neutral-100 hover:text-foreground transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-lg px-3 h-11 text-muted-foreground hover:bg-neutral-100 hover:text-foreground transition-colors"
              aria-label="User menu"
            >
              <User className="h-4 w-4" />
              {userName && (
                <span className="text-sm font-medium">
                  {userName}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link
                href="/settings"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Settings className="h-4 w-4" />
                {t("nav.settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 text-error-500 cursor-pointer focus:text-error-500"
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
