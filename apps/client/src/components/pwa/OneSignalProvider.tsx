"use client";

import { useEffect, useRef } from "react";
import OneSignal from "react-onesignal";

/** Resolves when OneSignal.init() completes (or rejects if init fails / is skipped). */
let initPromise: Promise<void> | null = null;

/**
 * Wait for OneSignal SDK initialization before calling any SDK methods.
 * Returns a rejected promise if OneSignal isn't configured.
 */
export function waitForOneSignal(): Promise<void> {
  if (!initPromise) return Promise.reject(new Error("OneSignal not configured"));
  return initPromise;
}

export function OneSignalProvider() {
  const initialized = useRef(false);

  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId || initialized.current) return;
    initialized.current = true;

    initPromise = OneSignal.init({
      appId,
      serviceWorkerParam: { scope: "/" },
      serviceWorkerPath: "/OneSignalSDKWorker.js",
      allowLocalhostAsSecureOrigin: process.env.NODE_ENV === "development",
    }).catch(async (err) => {
      if (String(err).includes("already initialized")) return;
      // Lazy-load Sentry only on error to avoid pulling it into the initial bundle
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
        tags: { feature: "push-notifications", integration: "onesignal" },
        extra: { appId: appId ? "present" : "missing", environment: process.env.NODE_ENV },
      });
    });
  }, []);

  return null;
}
