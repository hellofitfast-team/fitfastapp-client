"use client";

import { useTranslations } from "next-intl";
import { Menu, Bell, User, LogOut, Settings } from "lucide-react";
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
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-card">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* Left side - Menu button (mobile only) */}
        <div className="flex items-center">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-neutral-100 hover:text-foreground transition-colors lg:hidden"
            onClick={onMenuClick}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-1">
          {/* Language Switcher */}
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold text-muted-foreground hover:bg-neutral-100 hover:text-foreground transition-colors"
            onClick={switchLocale}
            aria-label="Switch language"
          >
            {currentLocale === "en" ? "AR" : "EN"}
          </button>

          {/* Notifications */}
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-neutral-100 hover:text-foreground transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-lg px-2.5 h-10 text-muted-foreground hover:bg-neutral-100 hover:text-foreground transition-colors"
                aria-label="User menu"
              >
                <User className="h-5 w-5" />
                {userName && (
                  <span className="hidden text-sm font-medium sm:inline-block">
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
                className="flex items-center gap-2 text-error-500 focus:text-error-500 cursor-pointer"
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
