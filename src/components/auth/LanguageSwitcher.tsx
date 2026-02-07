"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full">
          <Languages className="h-5 w-5" />
          <span className="sr-only">{t("selectLanguage")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleLanguageChange("en")}
          className={locale === "en" ? "bg-neutral-100" : ""}
        >
          {t("english")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange("ar")}
          className={locale === "ar" ? "bg-neutral-100" : ""}
        >
          {t("arabic")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
