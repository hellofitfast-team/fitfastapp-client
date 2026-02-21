"use client";

import { useEffect, useRef } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";

/**
 * Invisible component that links Convex user identity to OneSignal.
 * Renders inside the dashboard shell so it only runs for authenticated users.
 *
 * Responsibilities:
 * 1. Calls OneSignal.login(userId) to set external_id
 * 2. Listens for push subscription changes
 * 3. Syncs subscription state to push_subscriptions table via Convex mutation
 */
export function OneSignalIdentity() {
  const { profile } = useAuth();
  const linkedRef = useRef(false);
  const saveSubscription = useMutation(api.pushSubscriptions.saveSubscription);
  const deactivateSubscription = useMutation(api.pushSubscriptions.deactivateSubscription);

  useEffect(() => {
    if (!profile?._id || linkedRef.current) return;

    async function linkIdentity() {
      try {
        const OneSignal = (await import("react-onesignal")).default;

        // Link Convex user ID as OneSignal external_id
        await OneSignal.login(profile!._id);
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
      if (active) {
        saveSubscription({
          onesignalSubscriptionId: subscriptionId,
          deviceType: "web",
        }).catch((err) =>
          console.error("Failed to sync subscription:", err)
        );
      } else {
        deactivateSubscription({
          onesignalSubscriptionId: subscriptionId,
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
  }, [profile?._id, saveSubscription, deactivateSubscription]);

  return null;
}
