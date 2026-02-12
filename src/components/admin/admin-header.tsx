"use client";

import { useTranslations } from "next-intl";
import { Menu, LogOut, Globe } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AdminHeaderProps {
  onMenuClick?: () => void;
  coachName?: string;
}

export function AdminHeader({ onMenuClick, coachName }: AdminHeaderProps) {
  const t = useTranslations("admin");
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = params.locale as string;

  const switchLocale = () => {
    const newLocale = currentLocale === "en" ? "ar" : "en";
    router.replace(pathname, { locale: newLocale });
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-stone-200 bg-white">
      <div className="flex h-full items-center justify-between px-4 lg:px-8">
        {/* Left - Menu button (mobile) */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors lg:hidden"
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Center spacer on desktop */}
        <div className="hidden lg:block" />

        {/* Right - Actions */}
        <div className="flex items-center gap-2">
          {coachName && (
            <span className="hidden text-sm font-semibold text-primary sm:block">
              {coachName}
            </span>
          )}

          {/* Language Switcher */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors"
            onClick={switchLocale}
            aria-label="Switch language"
          >
            <Globe className="h-4 w-4" />
          </button>

          {/* Sign Out */}
          <button
            className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 h-9 text-sm font-medium text-stone-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t("signOut")}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
