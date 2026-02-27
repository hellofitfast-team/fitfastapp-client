"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, Trash2 } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { SaveButton } from "./save-button";

type PaymentMethod = {
  type: string;
  accountName: string;
  accountNumber: string;
  instructions?: string;
};

const ACCOUNT_TYPES = [
  "InstaPay",
  "Vodafone Cash",
  "Orange Cash",
  "Etisalat Cash",
  "CIB",
  "Other",
] as const;

function emptyMethod(): PaymentMethod {
  return {
    type: "InstaPay",
    accountName: "",
    accountNumber: "",
    instructions: "",
  };
}

export function PaymentMethodsManager() {
  const t = useTranslations("settings");
  const { isAuthenticated } = useConvexAuth();
  const serverMethods = useQuery(api.systemConfig.getPaymentMethods, isAuthenticated ? {} : "skip");
  const updatePaymentMethods = useMutation(api.systemConfig.updatePaymentMethods);

  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [confirmRemoveIdx, setConfirmRemoveIdx] = useState<number | null>(null);

  // Initialize local state once server data arrives (setState during render is safe if conditional)
  if (serverMethods !== undefined && methods === null) {
    setMethods(serverMethods.length > 0 ? serverMethods : []);
  }

  if (methods === null) {
    return (
      <div className="space-y-3">
        {[1].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl border border-stone-200 bg-stone-50"
          />
        ))}
      </div>
    );
  }

  const handleAdd = () => {
    setMethods([...methods, emptyMethod()]);
  };

  const handleRemove = (index: number) => {
    if (confirmRemoveIdx === index) {
      setMethods(methods.filter((_, i) => i !== index));
      setConfirmRemoveIdx(null);
    } else {
      setConfirmRemoveIdx(index);
    }
  };

  const handleChange = <K extends keyof PaymentMethod>(
    index: number,
    field: K,
    value: PaymentMethod[K],
  ) => {
    setMethods(methods.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  const handleSave = async () => {
    try {
      const cleanMethods = methods.map((m) => ({
        type: m.type,
        accountName: m.accountName.trim(),
        accountNumber: m.accountNumber.trim(),
        instructions: m.instructions?.trim() || undefined,
      }));
      await updatePaymentMethods({ paymentMethods: cleanMethods });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { feature: "admin-settings", operation: "update-payment-methods" },
      });
      throw error;
    }
  };

  return (
    <div className="space-y-4">
      {methods.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-200 p-8 text-center">
          <p className="text-sm text-stone-400">
            No payment methods yet. Add a method for clients to pay.
          </p>
        </div>
      )}

      {methods.map((method, index) => (
        <div key={index} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          {/* Card header */}
          <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/50 px-4 py-3">
            <span className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
              {t("paymentMethodCard")} {index + 1}
            </span>
            <button
              onClick={() => handleRemove(index)}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                confirmRemoveIdx === index
                  ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  : "border-stone-200 text-stone-400 hover:border-red-200 hover:text-red-600"
              }`}
            >
              <Trash2 className="h-3 w-3" />
              {confirmRemoveIdx === index ? t("confirmRemoveMethod") : t("removeMethod")}
            </button>
          </div>

          <div className="space-y-3 p-4">
            {/* Type */}
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">
                {t("accountType")}
              </label>
              <select
                value={method.type}
                onChange={(e) => handleChange(index, "type", e.target.value)}
                className="focus:ring-primary/20 focus:border-primary h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 transition-all focus:ring-2 focus:outline-none"
              >
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Account Name & Number */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">
                  {t("accountName")}
                </label>
                <input
                  type="text"
                  value={method.accountName}
                  onChange={(e) => handleChange(index, "accountName", e.target.value)}
                  placeholder="Ahmed Hassan"
                  className="focus:ring-primary/20 focus:border-primary h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 transition-all placeholder:text-stone-400 focus:ring-2 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">
                  {t("accountNumber")}
                </label>
                <input
                  type="text"
                  value={method.accountNumber}
                  onChange={(e) => handleChange(index, "accountNumber", e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="focus:ring-primary/20 focus:border-primary h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 transition-all placeholder:text-stone-400 focus:ring-2 focus:outline-none"
                />
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">
                {t("instructions")}
              </label>
              <textarea
                value={method.instructions ?? ""}
                onChange={(e) => handleChange(index, "instructions", e.target.value)}
                placeholder={t("instructionsPlaceholder")}
                rows={2}
                className="focus:ring-primary/20 focus:border-primary w-full resize-none rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 transition-all placeholder:text-stone-400 focus:ring-2 focus:outline-none"
              />
            </div>
          </div>
        </div>
      ))}

      {/* Add button */}
      <button
        onClick={handleAdd}
        className="hover:border-primary/30 hover:text-primary flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-200 py-3 text-sm font-medium text-stone-400 transition-colors"
      >
        <Plus className="h-4 w-4" />
        {t("addPaymentMethod")}
      </button>

      {/* Save button */}
      <div className="flex justify-end pt-2">
        <SaveButton onSave={handleSave} label={t("savePaymentMethods")} />
      </div>
    </div>
  );
}
