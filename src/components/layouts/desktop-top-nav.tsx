"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
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
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

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
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors",
        isActive
          ? "bg-black text-primary"
          : "hover:bg-black hover:text-cream"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
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

  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, "") || "/";

  const switchLocale = () => {
    const newLocale = currentLocale === "en" ? "ar" : "en";
    router.replace(pathname, { locale: newLocale });
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <nav className="hidden lg:flex h-[var(--height-desktop-nav)] border-b-4 border-black bg-cream items-center justify-between px-4">
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
          <span className="font-black text-lg tracking-tight">FITFAST</span>
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
            />
          );
        })}
      </div>

      {/* Right: Lang switch, notifications, user menu */}
      <div className="flex items-center gap-2">
        {/* Language Switcher */}
        <button
          className="flex h-10 w-10 items-center justify-center border-4 border-black bg-cream font-mono text-xs font-bold hover:bg-black hover:text-primary transition-colors"
          onClick={switchLocale}
          aria-label="Switch language"
        >
          {currentLocale === "en" ? "AR" : "EN"}
        </button>

        {/* Notifications */}
        <button
          className="flex h-10 w-10 items-center justify-center border-4 border-black bg-cream hover:bg-primary hover:text-white hover:border-primary transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 border-4 border-black bg-cream px-3 h-10 hover:bg-black hover:text-cream transition-colors"
              aria-label="User menu"
            >
              <User className="h-4 w-4" />
              {userName && (
                <span className="font-bold text-sm uppercase tracking-wide">
                  {userName}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 border-4 border-black rounded-none bg-cream p-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <DropdownMenuItem asChild className="rounded-none">
              <Link
                href="/settings"
                className="flex items-center gap-2 px-4 py-3 font-bold uppercase text-sm hover:bg-black hover:text-cream cursor-pointer"
              >
                <Settings className="h-4 w-4" />
                {t("nav.settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-black h-[2px] m-0" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-3 font-bold uppercase text-sm text-primary hover:bg-primary hover:text-white cursor-pointer rounded-none"
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
