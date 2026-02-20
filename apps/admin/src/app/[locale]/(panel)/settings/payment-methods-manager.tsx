"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as Sentry from "@sentry/nextjs";

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
  const serverMethods = useQuery(api.systemConfig.getPaymentMethods);
  const updatePaymentMethods = useMutation(api.systemConfig.updatePaymentMethods);

  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmRemoveIdx, setConfirmRemoveIdx] = useState<number | null>(null);

  // Initialize local state once server data arrives
  useEffect(() => {
    if (serverMethods !== undefined && methods === null) {
      setMethods(serverMethods.length > 0 ? serverMethods : []);
    }
  }, [serverMethods, methods]);

  if (methods === null) {
    return (
      <div className="space-y-3">
        {[1].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl border border-stone-200 bg-stone-50 animate-pulse"
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
    value: PaymentMethod[K]
  ) => {
    setMethods(
      methods.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const cleanMethods = methods.map((m) => ({
        type: m.type,
        accountName: m.accountName.trim(),
        accountNumber: m.accountNumber.trim(),
        instructions: m.instructions?.trim() || undefined,
      }));
      await updatePaymentMethods({ paymentMethods: cleanMethods });
      toast({
        title: t("savePaymentMethodsSuccess"),
        description: t("savePaymentMethodsSuccessDescription"),
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { feature: "admin-settings", operation: "update-payment-methods" },
      });
      toast({
        title: t("savePaymentMethodsError"),
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive",
      });
    }
    setIsSaving(false);
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
        <div
          key={index}
          className="rounded-xl border border-stone-200 bg-white overflow-hidden"
        >
          {/* Card header */}
          <div className="flex items-center justify-between px-4 py-3 bg-stone-50/50 border-b border-stone-100">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
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

          <div className="p-4 space-y-3">
            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                {t("accountType")}
              </label>
              <select
                value={method.type}
                onChange={(e) => handleChange(index, "type", e.target.value)}
                className="w-full h-10 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                <label className="block text-xs font-medium text-stone-500 mb-1">
                  {t("accountName")}
                </label>
                <input
                  type="text"
                  value={method.accountName}
                  onChange={(e) =>
                    handleChange(index, "accountName", e.target.value)
                  }
                  placeholder="Ahmed Hassan"
                  className="w-full h-10 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">
                  {t("accountNumber")}
                </label>
                <input
                  type="text"
                  value={method.accountNumber}
                  onChange={(e) =>
                    handleChange(index, "accountNumber", e.target.value)
                  }
                  placeholder="01XXXXXXXXX"
                  className="w-full h-10 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                {t("instructions")}
              </label>
              <textarea
                value={method.instructions ?? ""}
                onChange={(e) =>
                  handleChange(index, "instructions", e.target.value)
                }
                placeholder={t("instructionsPlaceholder")}
                rows={2}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              />
            </div>
          </div>
        </div>
      ))}

      {/* Add button */}
      <button
        onClick={handleAdd}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-200 py-3 text-sm font-medium text-stone-400 hover:border-primary/30 hover:text-primary transition-colors"
      >
        <Plus className="h-4 w-4" />
        {t("addPaymentMethod")}
      </button>

      {/* Save button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-md shadow-primary/20"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : t("savePaymentMethods")}
        </button>
      </div>
    </div>
  );
}
