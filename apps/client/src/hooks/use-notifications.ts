"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import * as Sentry from "@sentry/nextjs";

/**
 * Hook for managing native Web Push notification subscriptions.
 * Uses the standard PushManager API — no third-party SDK needed.
 */
export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { profile } = useAuth();
  const saveSubscription = useMutation(api.pushSubscriptions.saveSubscription);
  const deactivateSubscription = useMutation(api.pushSubscriptions.deactivateSubscription);
  const vapidPublicKey = useQuery(api.pushSubscriptions.getVapidPublicKey);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      !!window.Notification &&
      "serviceWorker" in navigator &&
      !!navigator.serviceWorker &&
      "PushManager" in window;
    setIsSupported(supported);

    if (!supported) {
      setLoading(false);
      return;
    }

    setPermission(Notification.permission);

    // Check if already subscribed
    async function checkSubscription() {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        Sentry.captureException(
          err instanceof Error ? err : new Error("Push subscription check failed"),
          { tags: { feature: "push-notifications", operation: "check-subscription" } },
        );
      } finally {
        setLoading(false);
      }
    }

    checkSubscription();
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported || !vapidPublicKey || !profile?._id) return;
    setLoading(true);
    setError(null);

    try {
      // Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        setLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      // Convert VAPID key from base64url to ArrayBuffer for PushManager
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Extract the subscription data and save to Convex
      const json = subscription.toJSON();
      await saveSubscription({
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
        deviceType: "web",
      });

      setIsSubscribed(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to enable notifications";
      setError(message);
      Sentry.captureException(err instanceof Error ? err : new Error("Push subscribe failed"), {
        tags: { feature: "push-notifications", operation: "subscribe" },
      });
    } finally {
      setLoading(false);
    }
  }, [isSupported, vapidPublicKey, profile?._id, saveSubscription]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await deactivateSubscription({ endpoint });
      }

      setIsSubscribed(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to disable notifications";
      setError(message);
      Sentry.captureException(err instanceof Error ? err : new Error("Push unsubscribe failed"), {
        tags: { feature: "push-notifications", operation: "unsubscribe" },
      });
    } finally {
      setLoading(false);
    }
  }, [isSupported, deactivateSubscription]);

  const toggleSubscription = useCallback(async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  }, [isSubscribed, subscribe, unsubscribe]);

  return {
    isSupported,
    permission,
    isSubscribed,
    requestPermission: subscribe,
    toggleSubscription,
    loading,
    error,
  };
}

/** Convert a base64url-encoded VAPID public key to a Uint8Array for PushManager.subscribe() */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}
