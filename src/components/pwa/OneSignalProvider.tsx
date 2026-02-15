"use client";

import { useEffect, useRef } from "react";
import OneSignal from "react-onesignal";
import * as Sentry from "@sentry/nextjs";

export function OneSignalProvider() {
  const initialized = useRef(false);

  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId || initialized.current) return;
    initialized.current = true;

    OneSignal.init({
      appId,
      serviceWorkerParam: { scope: "/" },
      serviceWorkerPath: "/OneSignalSDKWorker.js",
      allowLocalhostAsSecureOrigin: process.env.NODE_ENV === "development",
    }).catch((err) => {
      if (String(err).includes("already initialized")) return;
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
        tags: { feature: "push-notifications", integration: "onesignal" },
        extra: { appId: appId ? "present" : "missing", environment: process.env.NODE_ENV },
      });
    });
  }, []);

  return null;
}
