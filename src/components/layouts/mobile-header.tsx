"use client";

import { useTranslations } from "next-intl";
import { Bell, User, LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

export function MobileHeader({ userName }: MobileHeaderProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = params.locale as string;

  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, "") || "/";
  const titleKey = PAGE_TITLES[pathWithoutLocale] || "nav.dashboard";

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
    <header className="sticky top-0 z-[var(--z-header)] h-[var(--height-header)] border-b-4 border-black bg-cream lg:hidden">
      <div className="flex h-full items-center justify-between px-4">
        {/* Page title */}
        <h1 className="text-lg font-black uppercase tracking-tight truncate">
          {t(titleKey)}
        </h1>

        {/* Actions */}
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
                className="flex h-10 w-10 items-center justify-center border-4 border-black bg-cream hover:bg-black hover:text-cream transition-colors"
                aria-label="User menu"
              >
                <User className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 border-4 border-black rounded-none bg-cream p-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              {userName && (
                <>
                  <div className="px-4 py-3 font-bold text-sm border-b-2 border-black/10">
                    {userName}
                  </div>
                </>
              )}
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
      </div>
    </header>
  );
}
