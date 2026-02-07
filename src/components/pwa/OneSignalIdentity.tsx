"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";

/**
 * Invisible component that links Supabase user identity to OneSignal.
 * Renders inside the dashboard shell so it only runs for authenticated users.
 *
 * Responsibilities:
 * 1. Calls OneSignal.login(userId) to set external_id
 * 2. Listens for push subscription changes
 * 3. Syncs subscription state to our push_subscriptions table
 */
export function OneSignalIdentity() {
  const { user } = useAuth();
  const linkedRef = useRef(false);

  useEffect(() => {
    if (!user?.id || linkedRef.current) return;

    async function linkIdentity() {
      try {
        const OneSignal = (await import("react-onesignal")).default;

        // Link Supabase user ID as OneSignal external_id
        await OneSignal.login(user!.id);
        linkedRef.current = true;

        // Sync current subscription if already opted in
        const subscriptionId = OneSignal.User.PushSubscription.id;
        const optedIn = OneSignal.User.PushSubscription.optedIn;

        if (optedIn && subscriptionId) {
          syncSubscription(subscriptionId, true);
        }

        // Listen for future subscription changes
        OneSignal.User.PushSubscription.addEventListener(
          "change",
          handleSubscriptionChange
        );
      } catch (err) {
        console.error("OneSignal identity link failed:", err);
      }
    }

    function handleSubscriptionChange(event: { current: { id?: string | null; optedIn?: boolean } }) {
      const { id, optedIn } = event.current;
      if (id) {
        syncSubscription(id, optedIn ?? false);
      }
    }

    function syncSubscription(subscriptionId: string, active: boolean) {
      const url = "/api/notifications/subscription";

      if (active) {
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            onesignal_subscription_id: subscriptionId,
            device_type: "web",
          }),
        }).catch((err) =>
          console.error("Failed to sync subscription:", err)
        );
      } else {
        fetch(url, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            onesignal_subscription_id: subscriptionId,
          }),
        }).catch((err) =>
          console.error("Failed to deactivate subscription:", err)
        );
      }
    }

    linkIdentity();

    return () => {
      // Cleanup listener on unmount
      import("react-onesignal")
        .then(({ default: OneSignal }) => {
          OneSignal.User.PushSubscription.removeEventListener(
            "change",
            handleSubscriptionChange
          );
        })
        .catch(() => {});
    };
  }, [user?.id]);

  return null;
}
