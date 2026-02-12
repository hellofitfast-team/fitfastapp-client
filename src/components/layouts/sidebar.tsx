"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
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
  X,
  LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// NavItem component with proper hover states
function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-4 border-b-2 border-black/10 px-6 py-4 font-bold uppercase text-sm tracking-wide transition-colors",
          isActive
            ? "bg-black text-primary"
            : "hover:bg-black hover:text-cream"
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {label}
      </Link>
    </li>
  );
}

function CloseButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      className="flex h-10 w-10 items-center justify-center border-4 border-black hover:bg-black hover:text-cream transition-colors"
      onClick={onClick}
    >
      <X className="h-5 w-5" />
    </button>
  );
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
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

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const t = useTranslations();
  const tBrand = useTranslations("brand");
  const pathname = usePathname();

  // Extract the path without locale
  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, "") || "/";

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          // Base styles
          "flex w-72 flex-col border-e-4 border-black bg-cream transition-transform duration-300",
          // Mobile: fixed positioning with transforms
          "fixed inset-y-0 start-0 z-50",
          // Desktop: relative positioning, always visible
          "lg:relative lg:z-auto lg:shrink-0",
          // Transform logic - only applied on mobile (< lg)
          isOpen
            ? "translate-x-0"
            : "-translate-x-full rtl:translate-x-full lg:translate-x-0 lg:rtl:translate-x-0"
        )}
      >
        {/* Mobile header */}
        <div className="flex h-16 items-center justify-between border-b-4 border-black px-4 lg:hidden">
          <div className="flex items-center gap-3">
            <Image
              src="/icons/icon-512x512.png"
              alt="FitFast"
              width={40}
              height={40}
              className="h-10 w-10 rounded"
            />
            <span className="font-black text-xl tracking-tight">FITFAST</span>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        {/* Desktop logo - h-16 matches header height exactly */}
        <div className="hidden h-16 border-b-4 border-black lg:flex">
          <div className="flex h-full items-center gap-3 px-4">
            <Image
              src="/icons/icon-512x512.png"
              alt="FitFast"
              width={40}
              height={40}
              className="h-10 w-10 rounded"
            />
            <span className="font-black text-xl tracking-tight">FITFAST</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto">
          <ul className="py-2">
            {navItems.map((item) => {
              const isActive =
                pathWithoutLocale === item.href ||
                (item.href !== "/" && pathWithoutLocale.startsWith(item.href));

              return (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={t(item.labelKey)}
                  isActive={isActive}
                  onClick={onClose}
                />
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t-4 border-black p-4 bg-black text-cream">
          <p className="font-mono text-xs tracking-[0.2em]">
            {tBrand("name").toUpperCase()}™ V1.0.0
          </p>
          <p className="font-mono text-[10px] tracking-[0.15em] mt-1 text-primary">
            {tBrand("tagline").toUpperCase()}
          </p>
        </div>
      </aside>
    </>
  );
}
