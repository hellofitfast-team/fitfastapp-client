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

  return (
    <header className="sticky top-0 z-40 h-16 border-b-4 border-black bg-[#FFFEF5]">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* Left side - Menu button (mobile only) */}
        <div className="flex items-center">
          <button
            className="flex h-10 w-10 items-center justify-center border-4 border-black bg-[#FFFEF5] hover:bg-black hover:text-[#FFFEF5] transition-colors lg:hidden"
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
            className="flex h-10 w-10 items-center justify-center border-4 border-black bg-[#FFFEF5] font-mono text-xs font-bold hover:bg-black hover:text-[#00FF94] transition-colors"
            onClick={switchLocale}
            aria-label="Switch language"
          >
            {currentLocale === "en" ? "AR" : "EN"}
          </button>

          {/* Notifications */}
          <button
            className="flex h-10 w-10 items-center justify-center border-4 border-black bg-[#FFFEF5] hover:bg-[#FF3B00] hover:text-white hover:border-[#FF3B00] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 border-4 border-black bg-[#FFFEF5] px-3 h-10 hover:bg-black hover:text-[#FFFEF5] transition-colors"
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
              className="w-48 border-4 border-black rounded-none bg-[#FFFEF5] p-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <DropdownMenuItem asChild className="rounded-none">
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-4 py-3 font-bold uppercase text-sm hover:bg-black hover:text-[#FFFEF5] cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                  {t("nav.settings")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-black h-[2px] m-0" />
              <DropdownMenuItem className="flex items-center gap-2 px-4 py-3 font-bold uppercase text-sm text-[#FF3B00] hover:bg-[#FF3B00] hover:text-white cursor-pointer rounded-none">
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
