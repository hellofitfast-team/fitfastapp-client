"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker) return;

    // Guard against multiple reloads during SW activation
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // Detect when a new SW version is found
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            // New SW installed + existing controller = app update available
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // Tell the new SW to activate — controllerchange will reload the page
              newWorker.postMessage({ action: "SKIP_WAITING" });
            }
          });
        });

        // Check for SW updates every 30 minutes while the app is open
        const UPDATE_INTERVAL_MS = 30 * 60 * 1000;
        setInterval(() => registration.update(), UPDATE_INTERVAL_MS);

        // Also check for updates when the app regains focus (user switches back to the PWA)
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            registration.update();
          }
        });
      })
      .catch((err) => {
        console.error("SW registration failed:", err);
      });
  }, []);

  return null;
}
