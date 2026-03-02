"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
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
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { PaymentScreenshot } from "@/components/payment-screenshot";

interface OcrData {
  amount?: string;
  sender_name?: string;
  reference_number?: string;
  date?: string;
  bank?: string;
  [key: string]: unknown;
}

const statusStyles: Record<string, string> = {
  pending: "bg-primary/10 text-primary border-primary/20",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

// PaymentScreenshot imported from shared component

export function SignupsTable() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const { isAuthenticated } = useConvexAuth();
  const signups = useQuery(api.pendingSignups.getAllSignups, isAuthenticated ? {} : "skip");
  const approveSignup = useMutation(api.pendingSignups.approveSignup);
  const rejectSignup = useMutation(api.pendingSignups.rejectSignup);

  const [actionId, setActionId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Track which signup's reject input is open
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  if (signups === undefined) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const handleApprove = async (signupId: Id<"pendingSignups">) => {
    setActionId(signupId);
    try {
      await approveSignup({ signupId });
    } catch (err) {
      console.error("Approve failed:", err); // Sentry captures this
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
      console.error("Reject failed:", err); // Sentry captures this
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
        <UserPlus className="mx-auto mb-4 h-12 w-12 text-stone-300" />
        <p className="font-medium text-stone-500">{t("noResults")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <table className="w-full">
        <thead>
          <tr className="border-b border-stone-100 bg-stone-50/50">
            <th
              scope="col"
              className="px-4 py-3 text-start text-xs font-medium tracking-wide text-stone-500 uppercase"
            >
              {t("client")}
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-start text-xs font-medium tracking-wide text-stone-500 uppercase"
            >
              {t("plan")}
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-start text-xs font-medium tracking-wide text-stone-500 uppercase"
            >
              {t("status")}
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-start text-xs font-medium tracking-wide text-stone-500 uppercase"
            >
              {t("date")}
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-end text-xs font-medium tracking-wide text-stone-500 uppercase"
            >
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
              ? Object.entries(ocrData).filter(([, v]) => v !== null && v !== undefined && v !== "")
              : [];

            return (
              <tr
                key={signup._id}
                className="border-b border-stone-100 transition-colors last:border-0 focus-within:bg-stone-50 hover:bg-stone-50/50"
              >
                <td colSpan={5} className="p-0">
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center">
                    {/* Client */}
                    <div className="px-4 py-4">
                      <p className="text-sm font-medium text-stone-900">{signup.fullName}</p>
                      <p className="text-xs text-stone-500">{signup.email}</p>
                      {signup.phone && <p className="text-xs text-stone-400">{signup.phone}</p>}
                    </div>

                    {/* Plan */}
                    <div className="px-4 py-4">
                      <span className="text-primary text-xs font-semibold">
                        {signup.planTier ? t(`tierLabels.${signup.planTier}`) : "---"}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                          statusStyles[signup.status] ?? ""
                        }`}
                      >
                        {signup.status === "pending" && <Clock className="h-3 w-3" />}
                        {signup.status === "approved" && <Check className="h-3 w-3" />}
                        {signup.status === "rejected" && <X className="h-3 w-3" />}
                        {t(`clientDetail.paymentStatus.${signup.status}`)}
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
                          className="flex min-h-11 items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 text-xs font-medium text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-700"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {t("viewDetails")}
                        </Link>

                        {/* Payment toggle */}
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : signup._id)}
                          className={`flex min-h-11 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
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
                              className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                            >
                              <Check className="h-3 w-3" />
                              {t("approve")}
                            </button>
                            <button
                              onClick={() => handleRejectClick(signup._id)}
                              disabled={actionId === signup._id}
                              className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
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
                      <p className="mb-2 text-xs font-medium text-stone-600">
                        {t("rejectionReasonLabel")}
                      </p>
                      <div className="flex items-start gap-3">
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder={t("rejectionReasonPlaceholder")}
                          rows={2}
                          className="focus:ring-primary/20 focus:border-primary flex-1 resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 transition-all placeholder:text-stone-400 focus:ring-2 focus:outline-none"
                          autoFocus
                        />
                        <div className="flex shrink-0 flex-col gap-2">
                          <button
                            onClick={() => handleRejectSubmit(signup._id)}
                            disabled={actionId === signup._id || !rejectionReason.trim()}
                            className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                          >
                            <X className="h-3 w-3" />
                            {t("confirmReject")}
                          </button>
                          <button
                            onClick={handleRejectCancel}
                            disabled={actionId === signup._id}
                            className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-50"
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
                        {signup.paymentScreenshotId ? (
                          <PaymentScreenshot
                            storageId={signup.paymentScreenshotId}
                            variant="card"
                          />
                        ) : (
                          <div className="flex w-64 shrink-0 items-center justify-center rounded-lg border border-dashed border-stone-200 p-8">
                            <div className="text-center">
                              <ImageIcon className="mx-auto mb-2 h-8 w-8 text-stone-300" />
                              <p className="text-xs text-stone-400">{t("noScreenshot")}</p>
                            </div>
                          </div>
                        )}

                        {/* OCR extracted data */}
                        {ocrEntries.length > 0 && (
                          <div className="flex-1">
                            <p className="mb-2 text-[10px] font-medium tracking-wide text-stone-400 uppercase">
                              {t("extractedPaymentData")}
                            </p>
                            <div className="space-y-2">
                              {ocrEntries.map(([key, value]) => (
                                <div
                                  key={key}
                                  className="flex items-baseline gap-3 border-b border-stone-100 pb-2"
                                >
                                  <span className="text-primary w-16 shrink-0 text-[10px] font-medium tracking-wide uppercase">
                                    {t(`ocrLabels.${key}` as Parameters<typeof t>[0]) || key}
                                  </span>
                                  <span className="text-sm text-stone-900">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {ocrEntries.length === 0 && (
                          <div className="flex flex-1 items-center">
                            <p className="text-xs text-stone-400">
                              {signup.paymentScreenshotId ? t("noOcrData") : t("noPaymentProof")}
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
