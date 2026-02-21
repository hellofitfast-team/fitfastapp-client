"use client";

import { useRouter, usePathname } from "@fitfast/i18n/navigation";
import { useParams } from "next/navigation";

export function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = params.locale as string;

  const switchLocale = () => {
    const newLocale = currentLocale === "en" ? "ar" : "en";
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <button
      onClick={switchLocale}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold text-muted-foreground hover:bg-neutral-100 hover:text-foreground transition-colors"
    >
      {currentLocale === "en" ? "AR" : "EN"}
    </button>
  );
}
