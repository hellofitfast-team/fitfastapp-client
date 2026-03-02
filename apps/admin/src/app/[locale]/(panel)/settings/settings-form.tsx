"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Calendar, DollarSign, Share2, Wallet } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { PlansManager } from "./plans-manager";
import { PaymentMethodsManager } from "./payment-methods-manager";
import { SocialLinksManager } from "./social-links-manager";
import { SaveButton } from "./save-button";
import { NotificationToggle } from "./notification-toggle";

export function AdminSettingsForm() {
  const t = useTranslations("admin");
  const tSettings = useTranslations("settings");
  const { isAuthenticated } = useConvexAuth();
  const setConfig = useMutation(api.systemConfig.setConfig);

  const checkInConfig = useQuery(
    api.systemConfig.getConfig,
    isAuthenticated
      ? {
          key: "check_in_frequency_days",
        }
      : "skip",
  );

  const [checkInDays, setCheckInDays] = useState<string | null>(null);

  const effectiveCheckInDays = checkInDays ?? String(checkInConfig?.value ?? "14");

  if (checkInConfig === undefined) {
    return null;
  }

  const handleSave = async () => {
    try {
      await setConfig({
        key: "check_in_frequency_days",
        value: Number(effectiveCheckInDays) || 14,
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          feature: "admin-settings",
          operation: "update-config",
          panel: "admin",
        },
        extra: {
          configKeys: ["check_in_frequency_days"],
        },
      });
      throw error;
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      {/* ===== General Settings ===== */}
      <div className="space-y-6">
        {/* Check-in frequency */}
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
              <Calendar className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-stone-900">{t("checkInFrequency")}</h2>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="7"
              max="30"
              value={effectiveCheckInDays}
              onChange={(e) => setCheckInDays(e.target.value)}
              className="text-primary focus:ring-primary/20 focus:border-primary h-11 w-24 rounded-xl border border-stone-200 bg-stone-50 px-3 text-center text-lg font-bold transition-all focus:ring-2 focus:outline-none"
            />
            <span className="text-sm text-stone-500">{t("daysBetweenCheckIns")}</span>
          </div>
        </div>

        {/* Notification toggle */}
        <NotificationToggle />

        {/* Save general settings */}
        <div className="flex justify-end">
          <SaveButton onSave={handleSave} label={t("save")} savingLabel={t("saving")} />
        </div>
      </div>

      {/* ===== Pricing Plans ===== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
            <DollarSign className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-900">{tSettings("pricingPlans")}</h2>
            <p className="mt-0.5 text-xs text-stone-400">{t("configurePlans")}</p>
          </div>
        </div>
        <PlansManager />
      </div>

      {/* ===== Payment Methods ===== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-900">{tSettings("paymentMethods")}</h2>
            <p className="mt-0.5 text-xs text-stone-400">{t("configurePayments")}</p>
          </div>
        </div>
        <PaymentMethodsManager />
      </div>

      {/* ===== Social Links ===== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
            <Share2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-900">{tSettings("socialLinks")}</h2>
            <p className="mt-0.5 text-xs text-stone-400">{tSettings("socialLinksDesc")}</p>
          </div>
        </div>
        <SocialLinksManager />
      </div>
    </div>
  );
}
