"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, X } from "lucide-react";
import { Button } from "@fitfast/ui/button";

const SESSION_DISMISS_KEY = "fitfast-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const t = useTranslations("pwa");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [dismissed, setDismissed] = useState(true); // hidden by default until check

  useEffect(() => {
    // Already installed as PWA?
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Session-only dismiss check
    if (sessionStorage.getItem(SESSION_DISMISS_KEY)) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with browser install state
    setDismissed(false);

    // iOS detection (Safari on iOS doesn't fire beforeinstallprompt)
    // iPadOS 13+ reports as "Macintosh" so also check maxTouchPoints
    const userAgent = navigator.userAgent;
    const isIos =
      (/iPad|iPhone|iPod/.test(userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;

    if (isIos) {
      setShowIos(true);
      return;
    }

    // Android/Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
    dismiss();
  };

  const dismiss = () => {
    sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    setDismissed(true);
  };

  // Nothing to show
  if (dismissed || (!deferredPrompt && !showIos)) return null;

  return (
    <div className="border-primary/10 bg-primary/5 relative z-0 flex items-center gap-3 border-b px-4 py-2.5 lg:hidden">
      {/* App icon */}
      <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
        <Download className="text-primary h-4 w-4" />
      </div>

      {/* Text */}
      <p className="min-w-0 flex-1 truncate text-xs font-medium">
        {showIos ? t("iosInstructions") : t("installDescription")}
      </p>

      {/* Install button (not shown on iOS — they use share sheet) */}
      {!showIos && (
        <Button onClick={handleInstall} size="sm" className="h-8 shrink-0 px-3 text-xs">
          {t("installButton")}
        </Button>
      )}

      {/* Dismiss (session only) */}
      <button
        onClick={dismiss}
        className="hover:bg-primary/10 shrink-0 rounded-md p-1 transition-colors"
        aria-label="Dismiss"
      >
        <X className="text-muted-foreground h-3.5 w-3.5" />
      </button>
    </div>
  );
}
