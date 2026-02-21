"use client";

import { useCallback, useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";

export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    // Check subscription state: try OneSignal, fall back to permission check
    async function checkSubscription() {
      try {
        const OneSignal = (await import("react-onesignal")).default;
        const optedIn = OneSignal.User.PushSubscription.optedIn;
        setIsSubscribed(optedIn ?? false);
      } catch (err) {
        setIsSubscribed(Notification.permission === "granted");
        setError("onesignal_unavailable");
        Sentry.captureException(err instanceof Error ? err : new Error("OneSignal subscription check failed"), {
          tags: { feature: "push-notifications", operation: "check-subscription" },
        });
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
      const result = await Notification.requestPermission();
      setPermission(result);
      setIsSubscribed(result === "granted");

      // Best-effort OneSignal sync
      if (result === "granted") {
        import("react-onesignal")
          .then((mod) => mod.default.User.PushSubscription.optIn())
          .catch((err) => {
            Sentry.captureException(err, {
              tags: { feature: "push-notifications", operation: "onesignal-sync" },
              level: "warning",
            });
          });
      }
    } catch (err) {
      Sentry.captureException(err instanceof Error ? err : new Error("Permission request failed"), {
        tags: { feature: "push-notifications", operation: "request-permission" },
      });
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  const toggleSubscription = useCallback(async () => {
    if (!isSupported) return;
    setLoading(true);

    try {
      if (isSubscribed) {
        // Opt out: update UI immediately, try OneSignal in background
        setIsSubscribed(false);
        import("react-onesignal")
          .then((mod) => mod.default.User.PushSubscription.optOut())
          .catch((err) => {
            Sentry.captureException(err, {
              tags: { feature: "push-notifications", operation: "onesignal-sync" },
              level: "warning",
            });
          });
      } else {
        // Opt in: request permission via native API first
        let perm = Notification.permission;
        if (perm === "default") {
          perm = await Notification.requestPermission();
          setPermission(perm);
        }

        if (perm === "granted") {
          setIsSubscribed(true);
          // Best-effort OneSignal sync
          import("react-onesignal")
            .then((mod) => mod.default.User.PushSubscription.optIn())
            .catch((err) => {
              Sentry.captureException(err, {
                tags: { feature: "push-notifications", operation: "onesignal-sync" },
                level: "warning",
              });
            });
        }
      }
    } catch (err) {
      Sentry.captureException(err instanceof Error ? err : new Error("Toggle subscription failed"), {
        tags: { feature: "push-notifications", operation: "toggle-subscription" },
      });
    } finally {
      setLoading(false);
    }
  }, [isSupported, isSubscribed]);

  return { isSupported, permission, isSubscribed, requestPermission, toggleSubscription, loading, error };
}
