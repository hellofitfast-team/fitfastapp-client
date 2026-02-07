"use client";

import { useCallback, useEffect, useState } from "react";

export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      !!window.Notification &&
      "serviceWorker" in navigator &&
      !!navigator.serviceWorker;
    setIsSupported(supported);

    if (!supported) {
      setLoading(false);
      return;
    }

    setPermission(Notification.permission);

    // Check OneSignal subscription state if available
    async function checkSubscription() {
      try {
        const OneSignal = (await import("react-onesignal")).default;
        const optedIn = OneSignal.User.PushSubscription.optedIn;
        setIsSubscribed(optedIn ?? false);
      } catch {
        setIsSubscribed(Notification.permission === "granted");
      } finally {
        setLoading(false);
      }
    }

    checkSubscription();
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return;
    setLoading(true);

    try {
      const OneSignal = (await import("react-onesignal")).default;
      await OneSignal.Notifications.requestPermission();
      const optedIn = OneSignal.User.PushSubscription.optedIn;
      setIsSubscribed(optedIn ?? false);
      setPermission(Notification.permission);
    } catch {
      // Fall back to native API if OneSignal isn't initialized
      const result = await Notification.requestPermission();
      setPermission(result);
      setIsSubscribed(result === "granted");
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  return { isSupported, permission, isSubscribed, requestPermission, loading };
}
