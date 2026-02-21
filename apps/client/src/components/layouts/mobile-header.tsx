"use client";

import { useTranslations } from "next-intl";
import { Bell, User, LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@fitfast/ui/dropdown-menu";
import { Link, useRouter, usePathname } from "@fitfast/i18n/navigation";
import { useParams } from "next/navigation";
import { useClerk } from "@clerk/nextjs";

const PAGE_TITLES: Record<string, string> = {
  "/": "nav.dashboard",
  "/meal-plan": "nav.mealPlan",
  "/workout-plan": "nav.workoutPlan",
  "/check-in": "nav.checkIn",
  "/tracking": "nav.tracking",
  "/progress": "nav.progress",
  "/tickets": "nav.tickets",
  "/faq": "nav.faq",
  "/settings": "nav.settings",
};

interface MobileHeaderProps {
  userName?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function MobileHeader({ userName }: MobileHeaderProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = params.locale as string;

  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, "") || "/";
  const isDashboard = pathWithoutLocale === "/";
  const titleKey = PAGE_TITLES[pathWithoutLocale] || "nav.dashboard";

  const { signOut } = useClerk();

  const switchLocale = () => {
    const newLocale = currentLocale === "en" ? "ar" : "en";
    router.replace(pathname, { locale: newLocale });
  };

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-[var(--z-header)] h-[var(--height-header)] border-b border-border bg-card/95 backdrop-blur-md lg:hidden">
      <div className="flex h-full items-center justify-between px-4">
        {/* Left side — Greeting or Title */}
        {isDashboard && userName ? (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
              {getInitials(userName)}
            </div>
            <div>
              <p className="text-sm font-bold">
                {userName.split(" ")[0]}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString(currentLocale === "ar" ? "ar-EG" : "en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-0.5 h-5 rounded-full bg-primary" />
            <h1 className="text-lg font-bold tracking-tight truncate">
              {t(titleKey)}
            </h1>
          </div>
        )}

        {/* Right side — Actions */}
        <div className="flex items-center gap-1.5">
          {/* Language Switcher */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold text-muted-foreground hover:bg-neutral-100 hover:text-foreground transition-colors"
            onClick={switchLocale}
            aria-label="Switch language"
          >
            {currentLocale === "en" ? "AR" : "EN"}
          </button>

          {/* Notifications */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-neutral-100 hover:text-foreground transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-neutral-100 hover:text-foreground transition-colors"
                aria-label="User menu"
              >
                <User className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {userName && (
                <div className="px-3 py-2 text-sm font-medium text-muted-foreground">
                  {userName}
                </div>
              )}
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
      </div>
    </header>
  );
}
