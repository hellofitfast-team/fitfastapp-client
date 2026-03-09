"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const t = useTranslations("common");
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      className="bg-destructive text-destructive-foreground fixed top-0 right-0 left-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium"
    >
      <WifiOff className="size-4" />
      {t("offline")}
    </div>
  );
}
