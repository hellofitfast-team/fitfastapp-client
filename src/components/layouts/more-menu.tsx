"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  CalendarCheck,
  TrendingUp,
  MessageSquare,
  HelpCircle,
  LucideIcon,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

interface MoreMenuItemConfig {
  href: string;
  icon: LucideIcon;
  labelKey: string;
}

const MORE_ITEMS: MoreMenuItemConfig[] = [
  { href: "/tracking", icon: CalendarCheck, labelKey: "nav.tracking" },
  { href: "/progress", icon: TrendingUp, labelKey: "nav.progress" },
  { href: "/tickets", icon: MessageSquare, labelKey: "nav.tickets" },
  { href: "/faq", icon: HelpCircle, labelKey: "nav.faq" },
];

interface MoreMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MoreMenu({ open, onOpenChange }: MoreMenuProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, "") || "/";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t("nav.more")}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-2 gap-3">
            {MORE_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathWithoutLocale === item.href ||
                pathWithoutLocale.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-4 transition-all min-h-[60px] active:scale-[0.97]",
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:bg-neutral-50"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="font-medium text-sm">
                    {t(item.labelKey)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
