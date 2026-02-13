"use client";

import { useTranslations } from "next-intl";
import { Menu, Bell, User, LogOut, Settings } from "lucide-react";
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

interface HeaderProps {
  onMenuClick?: () => void;
  userName?: string;
}

export function Header({ onMenuClick, userName }: HeaderProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = params.locale as string;

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
    <header className="sticky top-0 z-40 h-16 border-b-4 border-black bg-cream">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* Left side - Menu button (mobile only) */}
        <div className="flex items-center">
          <button
            className="flex h-12 w-12 items-center justify-center border-4 border-black bg-cream hover:bg-black hover:text-cream transition-colors lg:hidden"
            onClick={onMenuClick}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <button
            className="flex h-12 w-12 items-center justify-center border-4 border-black bg-cream font-mono text-xs font-bold hover:bg-black hover:text-primary transition-colors"
            onClick={switchLocale}
            aria-label="Switch language"
          >
            {currentLocale === "en" ? "AR" : "EN"}
          </button>

          {/* Notifications */}
          <button
            className="flex h-12 w-12 items-center justify-center border-4 border-black bg-cream hover:bg-primary hover:text-white hover:border-primary transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 border-4 border-black bg-cream px-3 h-12 hover:bg-black hover:text-cream transition-colors"
                aria-label="User menu"
              >
                <User className="h-5 w-5" />
                {userName && (
                  <span className="hidden font-bold text-sm uppercase tracking-wide sm:inline-block">
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
      </div>
    </header>
  );
}
