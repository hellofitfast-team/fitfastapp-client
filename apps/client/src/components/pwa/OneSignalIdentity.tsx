"use client";

import { useEffect, useRef } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { createLogger } from "@fitfast/config/logger";

const log = createLogger("onesignal-identity");

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
  const handlerRef = useRef<
    ((event: { current: { id?: string | null; optedIn?: boolean } }) => void) | null
  >(null);
  const saveSubscription = useMutation(api.pushSubscriptions.saveSubscription);
  const deactivateSubscription = useMutation(api.pushSubscriptions.deactivateSubscription);

  useEffect(() => {
    if (!profile?._id || linkedRef.current) return;

    // Skip entirely if OneSignal isn't configured (e.g. local dev without app ID)
    if (!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) return;

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

        // Assign handler to ref before adding listener to avoid stale closure
        handlerRef.current = function handleSubscriptionChange(event: {
          current: { id?: string | null; optedIn?: boolean };
        }) {
          const { id, optedIn } = event.current;
          if (id) {
            syncSubscription(id, optedIn ?? false);
          }
        };

        // Listen for future subscription changes
        OneSignal.User.PushSubscription.addEventListener("change", handlerRef.current);
      } catch (err) {
        log.error({ err, userId: profile?._id }, "OneSignal identity link failed");
      }
    }

    function syncSubscription(subscriptionId: string, active: boolean) {
      if (active) {
        saveSubscription({
          onesignalSubscriptionId: subscriptionId,
          deviceType: "web",
        }).catch((err) => log.error({ err, subscriptionId }, "Failed to sync push subscription"));
      } else {
        deactivateSubscription({
          onesignalSubscriptionId: subscriptionId,
        }).catch((err) =>
          log.error({ err, subscriptionId }, "Failed to deactivate push subscription"),
        );
      }
    }

    linkIdentity();

    return () => {
      // Cleanup listener on unmount using the stable ref
      if (!handlerRef.current) return;
      import("react-onesignal")
        .then(({ default: OneSignal }) => {
          OneSignal.User.PushSubscription.removeEventListener("change", handlerRef.current!);
        })
        .catch(() => {});
    };
  }, [profile?._id, saveSubscription, deactivateSubscription]);

  return null;
}
