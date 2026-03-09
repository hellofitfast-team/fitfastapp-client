"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Download, Plus, SquareArrowOutUpRight } from "lucide-react";
import { Button } from "@fitfast/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@fitfast/ui/drawer";
import { useKeyboardVisible } from "@/hooks/useKeyboardVisible";
import { usePathname } from "next/navigation";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const t = useTranslations("pwa");
  const keyboardVisible = useKeyboardVisible();
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [visible, setVisible] = useState(false);
  const [iosDrawerOpen, setIosDrawerOpen] = useState(false);

  // Detect if we're on a dashboard page (has bottom nav)
  const isDashboard =
    /^\/(en|ar)(\/|$)/.test(pathname) &&
    !/^\/(en|ar)\/(login|set-password|magic-link|accept-invite|expired|welcome|initial-assessment|pending)/.test(
      pathname,
    );

  useEffect(() => {
    // Already installed as PWA — hide permanently
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      return;
    }

    setVisible(true);

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

    // Listen for successful installation to hide prompt
    const installedHandler = () => {
      setDeferredPrompt(null);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setVisible(false);
    }
  }, [deferredPrompt]);

  // Hidden: not ready, keyboard open, or already installed
  if (!visible || keyboardVisible || (!deferredPrompt && !showIos)) return null;

  return (
    <>
      <div
        className={
          "bg-card/95 fixed inset-x-0 z-[var(--z-bottom-nav)] mx-auto flex w-fit items-center gap-2.5 rounded-full px-4 py-2.5 shadow-lg backdrop-blur-md lg:hidden " +
          (isDashboard
            ? "bottom-[calc(var(--height-bottom-nav)+max(0.5rem,env(safe-area-inset-bottom))+1rem)]"
            : "bottom-[max(1rem,env(safe-area-inset-bottom,0px))]")
        }
      >
        <Download className="text-primary h-4 w-4 shrink-0" />

        <p className="max-w-[220px] text-xs leading-tight font-medium">{t("installDescription")}</p>

        {showIos ? (
          <Button
            onClick={() => setIosDrawerOpen(true)}
            size="sm"
            className="h-7 shrink-0 rounded-full px-3 text-xs"
          >
            {t("installButton")}
          </Button>
        ) : (
          <Button
            onClick={handleInstall}
            size="sm"
            className="h-7 shrink-0 rounded-full px-3 text-xs"
          >
            {t("installButton")}
          </Button>
        )}
      </div>

      {/* iOS instructions bottom sheet */}
      <Drawer open={iosDrawerOpen} onOpenChange={setIosDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t("iosTitle")}</DrawerTitle>
          </DrawerHeader>
          <div className="px-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
            <p className="text-muted-foreground mb-6 text-sm">{t("iosDescription")}</p>

            <div className="space-y-5">
              {/* Step 1 */}
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{t("iosStep1")}</p>
                  <div className="text-muted-foreground mt-1.5 flex items-center gap-1.5">
                    <SquareArrowOutUpRight className="text-primary h-5 w-5" />
                    <span className="text-xs">{t("iosStep1Hint")}</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{t("iosStep2")}</p>
                  <div className="text-muted-foreground mt-1.5 flex items-center gap-1.5">
                    <Plus className="text-primary h-5 w-5" />
                    <span className="text-xs">{t("iosStep2Hint")}</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{t("iosStep3")}</p>
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
