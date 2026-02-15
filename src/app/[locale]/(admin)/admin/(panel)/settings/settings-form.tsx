"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Save, CreditCard, Calendar, Tag } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as Sentry from "@sentry/nextjs";

interface AdminSettingsFormProps {
  config: Record<string, unknown>;
}

export function AdminSettingsForm({ config }: AdminSettingsFormProps) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const instapay = (config.coach_instapay_account ?? {
    name: "",
    number: "",
  }) as { name: string; number: string };

  const pricing = (config.plan_pricing ?? {
    "3_months": 0,
    "6_months": 0,
    "12_months": 0,
  }) as { "3_months": number; "6_months": number; "12_months": number };

  const [checkInDays, setCheckInDays] = useState(
    String(config.check_in_frequency_days ?? "14")
  );
  const [instapayName, setInstapayName] = useState(instapay.name);
  const [instapayNumber, setInstapayNumber] = useState(instapay.number);

  const [price3, setPrice3] = useState(String(pricing["3_months"] ?? 0));
  const [price6, setPrice6] = useState(String(pricing["6_months"] ?? 0));
  const [price12, setPrice12] = useState(String(pricing["12_months"] ?? 0));

  const handleSave = async () => {
    const supabase = createClient();

    try {
      const results = await Promise.all([
        supabase
          .from("system_config")
          .update({ value: checkInDays } as never)
          .eq("key", "check_in_frequency_days"),
        supabase
          .from("system_config")
          .update({
            value: JSON.stringify({ name: instapayName, number: instapayNumber }),
          } as never)
          .eq("key", "coach_instapay_account"),
        supabase
          .from("system_config")
          .update({
            value: JSON.stringify({
              "3_months": Number(price3) || 0,
              "6_months": Number(price6) || 0,
              "12_months": Number(price12) || 0,
            }),
          } as never)
          .eq("key", "plan_pricing"),
      ]);

      // Check for Supabase errors in any update
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error(
          `Failed to update ${errors.length} setting(s): ${errors.map((e) => e.error?.message).join(", ")}`
        );
      }

      // Success feedback
      toast({
        title: t("saveSuccess"),
        description: t("saveSuccessDescription"),
      });

      startTransition(() => router.refresh());
    } catch (error) {
      // Log to Sentry with admin context
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

      // Error feedback via toast
      toast({
        title: t("saveError"),
        description: error instanceof Error ? error.message : t("saveErrorGeneric"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
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
            value={checkInDays}
            onChange={(e) => setCheckInDays(e.target.value)}
            className="w-24 h-11 rounded-xl border border-stone-200 bg-stone-50 px-3 text-lg font-bold text-primary text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <span className="text-sm text-stone-500">
            days between check-ins
          </span>
        </div>
      </div>

      {/* Plan Pricing */}
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
            { label: "3 Months", value: price3, setter: setPrice3 },
            { label: "6 Months", value: price6, setter: setPrice6 },
            { label: "12 Months", value: price12, setter: setPrice12 },
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
              value={instapayName}
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
              value={instapayNumber}
              onChange={(e) => setInstapayNumber(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full h-11 rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={isPending}
        className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-lg shadow-primary/20"
      >
        <Save className="h-4 w-4" />
        {isPending ? t("saving") : t("save")}
      </button>
    </div>
  );
}
