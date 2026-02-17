"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  Home,
  UtensilsCrossed,
  Dumbbell,
  ClipboardCheck,
  MoreHorizontal,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useKeyboardVisible } from "@/hooks/useKeyboardVisible";

interface NavItemConfig {
  href: string;
  icon: LucideIcon;
  labelKey: string;
  isPrimary?: boolean;
}

const NAV_ITEMS: NavItemConfig[] = [
  { href: "/", icon: Home, labelKey: "nav.dashboard" },
  { href: "/meal-plan", icon: UtensilsCrossed, labelKey: "nav.mealPlan" },
  { href: "/check-in", icon: ClipboardCheck, labelKey: "nav.checkIn", isPrimary: true },
  { href: "/workout-plan", icon: Dumbbell, labelKey: "nav.workoutPlan" },
];

function BottomNavItem({
  href,
  icon: Icon,
  label,
  isActive,
  isPrimary,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  isPrimary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 transition-colors min-h-[44px]",
        isPrimary
          ? isActive
            ? "text-white"
            : "text-primary"
          : isActive
            ? "text-primary"
            : "text-neutral-500 hover:text-black"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
          isPrimary
            ? isActive
              ? "bg-primary"
              : "bg-primary/10"
            : isActive
              ? "bg-primary/10"
              : ""
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
      </div>
      <span className={cn(
        "text-[10px] font-semibold leading-tight",
        isActive && "font-bold"
      )}>
        {label}
      </span>
    </Link>
  );
}

interface BottomNavProps {
  onMoreClick?: () => void;
}

export function BottomNav({ onMoreClick }: BottomNavProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const keyboardVisible = useKeyboardVisible();

  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, "") || "/";

  if (keyboardVisible) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[var(--z-bottom-nav)] border-t-4 border-black bg-cream pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="flex items-stretch h-[var(--height-bottom-nav)]">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathWithoutLocale === item.href ||
            (item.href !== "/" && pathWithoutLocale.startsWith(item.href));

          return (
            <BottomNavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={t(item.labelKey)}
              isActive={isActive}
              isPrimary={item.isPrimary}
            />
          );
        })}

        {/* More button */}
        <button
          onClick={onMoreClick}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-neutral-500 hover:text-black transition-colors min-h-[44px]"
        >
          <div className="flex h-8 w-8 items-center justify-center">
            <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
          </div>
          <span className="text-[10px] font-semibold leading-tight">
            {t("nav.more")}
          </span>
        </button>
      </div>
    </nav>
  );
}
