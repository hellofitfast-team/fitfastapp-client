"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Link } from "@fitfast/i18n/navigation";
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
import { formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface OcrData {
  amount?: string;
  sender_name?: string;
  reference_number?: string;
  date?: string;
  bank?: string;
  [key: string]: unknown;
}

const tierLabels: Record<string, string> = {
  "3_months": "3 Mo",
  "6_months": "6 Mo",
  "12_months": "12 Mo",
};

const statusStyles: Record<string, string> = {
  pending: "bg-primary/10 text-primary border-primary/20",
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

export function SignupsTable() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const signups = useQuery(api.pendingSignups.getAllSignups);
  const approveSignup = useMutation(api.pendingSignups.approveSignup);
  const rejectSignup = useMutation(api.pendingSignups.rejectSignup);

  const [actionId, setActionId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Track which signup's reject input is open
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  if (signups === undefined) return null;

  const handleApprove = async (signupId: Id<"pendingSignups">) => {
    setActionId(signupId);
    try {
      await approveSignup({ signupId });
    } catch (err) {
      console.error("Approve failed:", err);
      toast({
        title: t("actionError"),
        description: err instanceof Error ? err.message : t("actionErrorGeneric"),
        variant: "destructive",
      });
    }
    setActionId(null);
  };

  const handleRejectClick = (signupId: string) => {
    setRejectingId(signupId);
    setRejectionReason("");
  };

  const handleRejectSubmit = async (signupId: Id<"pendingSignups">) => {
    if (!rejectionReason.trim()) return;
    setActionId(signupId);
    try {
      await rejectSignup({ signupId, rejectionReason: rejectionReason.trim() });
      setRejectingId(null);
      setRejectionReason("");
    } catch (err) {
      console.error("Reject failed:", err);
      toast({
        title: t("actionError"),
        description: err instanceof Error ? err.message : t("actionErrorGeneric"),
        variant: "destructive",
      });
    }
    setActionId(null);
  };

  const handleRejectCancel = () => {
    setRejectingId(null);
    setRejectionReason("");
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
            const isExpanded = expandedId === signup._id;
            const isRejecting = rejectingId === signup._id;
            const ocrData = signup.ocrExtractedData as OcrData | null;
            const ocrEntries = ocrData
              ? Object.entries(ocrData).filter(
                  ([, v]) => v !== null && v !== undefined && v !== ""
                )
              : [];

            return (
              <tr
                key={signup._id}
                className="border-b border-stone-100 last:border-0 hover:bg-stone-50/50 transition-colors"
              >
                <td colSpan={5} className="p-0">
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center">
                    {/* Client */}
                    <div className="px-4 py-4">
                      <p className="font-medium text-sm text-stone-900">
                        {signup.fullName}
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
                      <span className="text-xs font-semibold text-primary">
                        {signup.planTier
                          ? tierLabels[signup.planTier] || signup.planTier
                          : "---"}
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
                      {formatDate(new Date(signup._creationTime).toISOString(), locale)}
                    </div>

                    {/* Actions */}
                    <div className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* View Details */}
                        <Link
                          href={`/signups/${signup._id}`}
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 text-xs font-medium text-stone-500 hover:border-stone-300 hover:text-stone-700 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {t("viewDetails")}
                        </Link>

                        {/* Payment toggle */}
                        <button
                          onClick={() =>
                            setExpandedId(isExpanded ? null : signup._id)
                          }
                          className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
                            isExpanded
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700"
                          }`}
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          {t("payment")}
                          <ChevronDown
                            className={`h-3 w-3 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {signup.status === "pending" && !isRejecting && (
                          <>
                            <button
                              onClick={() => handleApprove(signup._id)}
                              disabled={actionId === signup._id}
                              className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                            >
                              <Check className="h-3 w-3" />
                              {t("approve")}
                            </button>
                            <button
                              onClick={() => handleRejectClick(signup._id)}
                              disabled={actionId === signup._id}
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

                  {/* Inline rejection reason input */}
                  {isRejecting && (
                    <div className="border-t border-stone-100 bg-red-50/30 p-4">
                      <p className="text-xs font-medium text-stone-600 mb-2">
                        {t("rejectionReasonLabel")}
                      </p>
                      <div className="flex items-start gap-3">
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder={t("rejectionReasonPlaceholder")}
                          rows={2}
                          className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                          autoFocus
                        />
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => handleRejectSubmit(signup._id)}
                            disabled={actionId === signup._id || !rejectionReason.trim()}
                            className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            <X className="h-3 w-3" />
                            {t("confirmReject")}
                          </button>
                          <button
                            onClick={handleRejectCancel}
                            disabled={actionId === signup._id}
                            className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50"
                          >
                            {t("cancelReject")}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expanded payment details */}
                  {isExpanded && (
                    <div className="border-t border-stone-100 bg-stone-50/50 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row">
                        {/* No screenshot URL in Convex -- would need to resolve from storageId */}
                        <div className="flex w-64 shrink-0 items-center justify-center rounded-lg border border-dashed border-stone-200 p-8">
                          <div className="text-center">
                            <ImageIcon className="h-8 w-8 mx-auto text-stone-300 mb-2" />
                            <p className="text-xs text-stone-400">
                              {signup.paymentScreenshotId
                                ? t("screenshotUploadedViewDetails")
                                : t("noScreenshot")}
                            </p>
                          </div>
                        </div>

                        {/* OCR extracted data */}
                        {ocrEntries.length > 0 && (
                          <div className="flex-1">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400 mb-2">
                              {t("extractedPaymentData")}
                            </p>
                            <div className="space-y-2">
                              {ocrEntries.map(([key, value]) => (
                                <div
                                  key={key}
                                  className="flex items-baseline gap-3 border-b border-stone-100 pb-2"
                                >
                                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-primary w-16">
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

                        {ocrEntries.length === 0 && (
                          <div className="flex-1 flex items-center">
                            <p className="text-xs text-stone-400">
                              {signup.paymentScreenshotId
                                ? t("noOcrData")
                                : t("noPaymentProof")}
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
