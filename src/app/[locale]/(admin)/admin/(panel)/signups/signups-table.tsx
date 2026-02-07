"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Check,
  X,
  Clock,
  UserPlus,
  ChevronDown,
  Receipt,
  ExternalLink,
  ImageIcon,
} from "lucide-react";

interface OcrData {
  amount?: string;
  sender_name?: string;
  reference_number?: string;
  date?: string;
  bank?: string;
  [key: string]: unknown;
}

interface Signup {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  plan_tier: string | null;
  payment_screenshot_url: string | null;
  ocr_extracted_data: OcrData | null;
  status: string;
  created_at: string;
}

const tierLabels: Record<string, string> = {
  "3_months": "3 Mo",
  "6_months": "6 Mo",
  "12_months": "12 Mo",
};

const statusStyles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const ocrFieldLabels: Record<string, string> = {
  amount: "Amount",
  sender_name: "Sender",
  reference_number: "Ref #",
  date: "Date",
  bank: "Bank",
};

export function SignupsTable({ signups }: { signups: Signup[] }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAction = async (
    signupId: string,
    action: "approved" | "rejected"
  ) => {
    setActionId(signupId);
    const supabase = createClient();

    if (action === "approved") {
      const signup = signups.find((s) => s.id === signupId);
      if (!signup) return;

      const res = await fetch("/api/admin/approve-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signupId }),
      });

      if (!res.ok) {
        setActionId(null);
        return;
      }
    } else {
      await supabase
        .from("pending_signups")
        .update({ status: "rejected" as const, reviewed_at: new Date().toISOString() } as never)
        .eq("id", signupId);
    }

    setActionId(null);
    startTransition(() => router.refresh());
  };

  if (signups.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
        <UserPlus className="h-12 w-12 mx-auto text-stone-300 mb-4" />
        <p className="font-medium text-stone-500">
          {t("noResults")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-stone-100 bg-stone-50/50">
            <th className="px-4 py-3 text-start text-xs font-medium text-stone-500 uppercase tracking-wide">
              {t("client")}
            </th>
            <th className="px-4 py-3 text-start text-xs font-medium text-stone-500 uppercase tracking-wide">
              {t("plan")}
            </th>
            <th className="px-4 py-3 text-start text-xs font-medium text-stone-500 uppercase tracking-wide">
              {t("status")}
            </th>
            <th className="px-4 py-3 text-start text-xs font-medium text-stone-500 uppercase tracking-wide">
              {t("date")}
            </th>
            <th className="px-4 py-3 text-end text-xs font-medium text-stone-500 uppercase tracking-wide">
              {t("actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {signups.map((signup) => {
            const isExpanded = expandedId === signup.id;
            const ocrData = signup.ocr_extracted_data;
            const ocrEntries = ocrData
              ? Object.entries(ocrData).filter(
                  ([, v]) => v !== null && v !== undefined && v !== ""
                )
              : [];

            return (
              <tr
                key={signup.id}
                className="border-b border-stone-100 last:border-0 hover:bg-stone-50/50 transition-colors"
              >
                <td colSpan={5} className="p-0">
                  {/* Main row content as a grid to preserve table alignment */}
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center">
                    {/* Client */}
                    <div className="px-4 py-4">
                      <p className="font-medium text-sm text-stone-900">
                        {signup.full_name}
                      </p>
                      <p className="text-xs text-stone-500">
                        {signup.email}
                      </p>
                      {signup.phone && (
                        <p className="text-xs text-stone-400">
                          {signup.phone}
                        </p>
                      )}
                    </div>

                    {/* Plan */}
                    <div className="px-4 py-4">
                      <span className="text-xs font-semibold text-amber-600">
                        {signup.plan_tier
                          ? tierLabels[signup.plan_tier] || signup.plan_tier
                          : "—"}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                          statusStyles[signup.status] ?? ""
                        }`}
                      >
                        {signup.status === "pending" && (
                          <Clock className="h-3 w-3" />
                        )}
                        {signup.status === "approved" && (
                          <Check className="h-3 w-3" />
                        )}
                        {signup.status === "rejected" && (
                          <X className="h-3 w-3" />
                        )}
                        {signup.status}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="px-4 py-4 text-xs text-stone-500">
                      {new Date(signup.created_at).toLocaleDateString()}
                    </div>

                    {/* Actions */}
                    <div className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            setExpandedId(isExpanded ? null : signup.id)
                          }
                          className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
                            isExpanded
                              ? "border-amber-300 bg-amber-50 text-amber-700"
                              : "border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700"
                          }`}
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          Payment
                          <ChevronDown
                            className={`h-3 w-3 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {signup.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                handleAction(signup.id, "approved")
                              }
                              disabled={isPending || actionId === signup.id}
                              className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                            >
                              <Check className="h-3 w-3" />
                              {t("approve")}
                            </button>
                            <button
                              onClick={() =>
                                handleAction(signup.id, "rejected")
                              }
                              disabled={isPending || actionId === signup.id}
                              className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              <X className="h-3 w-3" />
                              {t("reject")}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded payment details */}
                  {isExpanded && (
                    <div className="border-t border-stone-100 bg-stone-50/50 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row">
                        {/* Payment screenshot */}
                        {signup.payment_screenshot_url ? (
                          <div className="shrink-0">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400 mb-2">
                              Payment Screenshot
                            </p>
                            <a
                              href={signup.payment_screenshot_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative block w-64 rounded-lg border border-stone-200 hover:border-amber-300 transition-colors overflow-hidden"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={signup.payment_screenshot_url}
                                alt={`Payment screenshot from ${signup.full_name}`}
                                className="w-full h-auto max-h-80 object-contain bg-stone-100"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                <span className="flex items-center gap-2 text-xs font-medium text-white">
                                  <ExternalLink className="h-4 w-4" />
                                  Open Full Size
                                </span>
                              </div>
                            </a>
                          </div>
                        ) : (
                          <div className="flex w-64 shrink-0 items-center justify-center rounded-lg border border-dashed border-stone-200 p-8">
                            <div className="text-center">
                              <ImageIcon className="h-8 w-8 mx-auto text-stone-300 mb-2" />
                              <p className="text-xs text-stone-400">
                                No screenshot
                              </p>
                            </div>
                          </div>
                        )}

                        {/* OCR extracted data */}
                        {ocrEntries.length > 0 && (
                          <div className="flex-1">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400 mb-2">
                              Extracted Payment Data
                            </p>
                            <div className="space-y-2">
                              {ocrEntries.map(([key, value]) => (
                                <div
                                  key={key}
                                  className="flex items-baseline gap-3 border-b border-stone-100 pb-2"
                                >
                                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-amber-600 w-16">
                                    {ocrFieldLabels[key] || key}
                                  </span>
                                  <span className="text-sm text-stone-900">
                                    {String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* No OCR data fallback */}
                        {ocrEntries.length === 0 && (
                          <div className="flex-1 flex items-center">
                            <p className="text-xs text-stone-400">
                              {signup.payment_screenshot_url
                                ? "No OCR data extracted — verify manually from screenshot"
                                : "No payment proof uploaded by client"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
