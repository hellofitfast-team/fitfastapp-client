"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Save, CreditCard, Calendar, Tag, DollarSign, Wallet } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as Sentry from "@sentry/nextjs";
import { PlansManager } from "./plans-manager";
import { PaymentMethodsManager } from "./payment-methods-manager";

export function AdminSettingsForm() {
  const t = useTranslations("admin");
  const tSettings = useTranslations("settings");
  const setConfig = useMutation(api.systemConfig.setConfig);

  const checkInConfig = useQuery(api.systemConfig.getConfig, {
    key: "check_in_frequency_days",
  });
  const instapayConfig = useQuery(api.systemConfig.getConfig, {
    key: "coach_instapay_account",
  });
  const pricingConfig = useQuery(api.systemConfig.getConfig, {
    key: "plan_pricing",
  });

  const instapay = (instapayConfig?.value ?? {
    name: "",
    number: "",
  }) as { name: string; number: string };

  const pricing = (pricingConfig?.value ?? {
    "3_months": 0,
    "6_months": 0,
    "12_months": 0,
  }) as { "3_months": number; "6_months": number; "12_months": number };

  const [checkInDays, setCheckInDays] = useState<string | null>(null);
  const [instapayName, setInstapayName] = useState<string | null>(null);
  const [instapayNumber, setInstapayNumber] = useState<string | null>(null);
  const [price3, setPrice3] = useState<string | null>(null);
  const [price6, setPrice6] = useState<string | null>(null);
  const [price12, setPrice12] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Use local state if edited, otherwise fall back to server values
  const effectiveCheckInDays = checkInDays ?? String(checkInConfig?.value ?? "14");
  const effectiveInstapayName = instapayName ?? instapay.name;
  const effectiveInstapayNumber = instapayNumber ?? instapay.number;
  const effectivePrice3 = price3 ?? String(pricing["3_months"] ?? 0);
  const effectivePrice6 = price6 ?? String(pricing["6_months"] ?? 0);
  const effectivePrice12 = price12 ?? String(pricing["12_months"] ?? 0);

  // Show loading while configs are being fetched
  if (checkInConfig === undefined || instapayConfig === undefined || pricingConfig === undefined) {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);

    try {
      await Promise.all([
        setConfig({
          key: "check_in_frequency_days",
          value: effectiveCheckInDays,
        }),
        setConfig({
          key: "coach_instapay_account",
          value: { name: effectiveInstapayName, number: effectiveInstapayNumber },
        }),
        setConfig({
          key: "plan_pricing",
          value: {
            "3_months": Number(effectivePrice3) || 0,
            "6_months": Number(effectivePrice6) || 0,
            "12_months": Number(effectivePrice12) || 0,
          },
        }),
      ]);

      toast({
        title: t("saveSuccess"),
        description: t("saveSuccessDescription"),
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          feature: "admin-settings",
          operation: "update-config",
          panel: "admin",
        },
        extra: {
          configKeys: ["check_in_frequency_days", "coach_instapay_account", "plan_pricing"],
        },
      });

      toast({
        title: t("saveError"),
        description: error instanceof Error ? error.message : t("saveErrorGeneric"),
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* ===== General Settings ===== */}
      <div className="space-y-6">
        {/* Check-in frequency */}
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-4 w-4" />
            </div>
            <h2 className="font-semibold text-sm text-stone-900">
              Check-in Frequency
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="7"
              max="30"
              value={effectiveCheckInDays}
              onChange={(e) => setCheckInDays(e.target.value)}
              className="w-24 h-11 rounded-xl border border-stone-200 bg-stone-50 px-3 text-lg font-bold text-primary text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <span className="text-sm text-stone-500">
              days between check-ins
            </span>
          </div>
        </div>

        {/* Plan Pricing (legacy) */}
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Tag className="h-4 w-4" />
            </div>
            <h2 className="font-semibold text-sm text-stone-900">
              Plan Pricing
            </h2>
          </div>
          <div className="space-y-3">
            {[
              { label: "3 Months", value: effectivePrice3, setter: setPrice3 },
              { label: "6 Months", value: effectivePrice6, setter: setPrice6 },
              { label: "12 Months", value: effectivePrice12, setter: setPrice12 },
            ].map((tier) => (
              <div key={tier.label}>
                <label className="block text-xs font-medium text-stone-500 mb-1">
                  {tier.label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={tier.value}
                    onChange={(e) => tier.setter(e.target.value)}
                    className="w-full h-11 rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <span className="shrink-0 text-xs font-medium text-stone-400">
                    EGP
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* InstaPay settings */}
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CreditCard className="h-4 w-4" />
            </div>
            <h2 className="font-semibold text-sm text-stone-900">
              InstaPay Account
            </h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Account Name
              </label>
              <input
                type="text"
                value={effectiveInstapayName}
                onChange={(e) => setInstapayName(e.target.value)}
                placeholder="Your InstaPay name..."
                className="w-full h-11 rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Account Number / Phone
              </label>
              <input
                type="text"
                value={effectiveInstapayNumber}
                onChange={(e) => setInstapayNumber(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full h-11 rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>

        {/* Save general settings */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-lg shadow-primary/20"
        >
          <Save className="h-4 w-4" />
          {isSaving ? t("saving") : t("save")}
        </button>
      </div>

      {/* ===== Pricing Plans ===== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <DollarSign className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-stone-900">
              {tSettings("pricingPlans")}
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Configure up to 4 pricing plans shown on the marketing page.
            </p>
          </div>
        </div>
        <PlansManager />
      </div>

      {/* ===== Payment Methods ===== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-stone-900">
              {tSettings("paymentMethods")}
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Configure the payment accounts shown to prospects during checkout.
            </p>
          </div>
        </div>
        <PaymentMethodsManager />
      </div>
    </div>
  );
}
