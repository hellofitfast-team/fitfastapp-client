"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Share, X } from "lucide-react";
import { Button } from "@fitfast/ui/button";

const DISMISS_KEY = "fitfast-install-dismissed";
const COOLDOWN_DAYS = 7;

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
    // Already installed?
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Cooldown check
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt);
      if (elapsed < COOLDOWN_DAYS * 24 * 60 * 60 * 1000) return;
    }

    setDismissed(false);

    // iOS detection (Safari on iOS doesn't fire beforeinstallprompt)
    const isIos =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;
    const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;

    if (isIos && !isInStandaloneMode) {
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
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  // Nothing to show
  if (dismissed || (!deferredPrompt && !showIos)) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 z-50 mx-auto max-w-md rounded-xl border border-border bg-card shadow-lg">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              {showIos ? (
                <Share className="h-5 w-5 text-primary" />
              ) : (
                <Download className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">
                {showIos ? t("iosTitle") : t("installTitle")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {showIos ? t("iosInstructions") : t("installDescription")}
              </p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="shrink-0 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {!showIos && (
          <div className="mt-3 flex gap-2">
            <Button onClick={handleInstall} className="flex-1" size="sm">
              {t("installButton")}
            </Button>
            <Button onClick={dismiss} variant="outline" size="sm">
              {t("dismissButton")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
