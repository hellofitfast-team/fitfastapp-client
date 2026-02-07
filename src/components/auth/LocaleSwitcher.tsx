"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
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
      className="flex h-10 w-10 items-center justify-center border-4 border-black bg-[#FFFEF5] font-mono text-xs font-bold hover:bg-black hover:text-[#00FF94] transition-colors"
    >
      {currentLocale === "en" ? "AR" : "EN"}
    </button>
  );
}
