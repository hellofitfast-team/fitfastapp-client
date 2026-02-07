"use client";

import { useEffect, useRef } from "react";
import OneSignal from "react-onesignal";

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
      console.error("OneSignal init failed:", err);
    });
  }, []);

  return null;
}
