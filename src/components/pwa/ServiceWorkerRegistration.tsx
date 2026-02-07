"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only manually register if OneSignal is NOT configured.
    // When OneSignal is active, it handles service worker registration itself
    // via OneSignalSDKWorker.js — registering a second worker on the same
    // scope causes conflicts.
    if (process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) return;

    if ("serviceWorker" in navigator && navigator.serviceWorker) {
      navigator.serviceWorker.register("/OneSignalSDKWorker.js", { scope: "/" }).catch((err) => {
        console.error("SW registration failed:", err);
      });
    }
  }, []);

  return null;
}
