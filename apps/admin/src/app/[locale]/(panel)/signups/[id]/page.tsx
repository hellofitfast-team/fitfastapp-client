"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Link } from "@fitfast/i18n/navigation";
import {
  ArrowLeft,
  Check,
  X,
  Clock,
  ImageIcon,
  AlertCircle,
  ZoomIn,
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

export default function SignupDetailPage() {
  const params = useParams();
  const signupId = params.id as string;
  const t = useTranslations("signupDetail");
  const locale = useLocale();

  const signup = useQuery(api.pendingSignups.getSignupById, {
    signupId: signupId as Id<"pendingSignups">,
  });

  const paymentImageUrl = useQuery(
    api.storage.getFileUrl,
    signup?.paymentScreenshotId
      ? { storageId: signup.paymentScreenshotId }
      : "skip"
  );

  const approveSignup = useMutation(api.pendingSignups.approveSignup);
  const rejectSignup = useMutation(api.pendingSignups.rejectSignup);

  const [isActioning, setIsActioning] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  const handleApprove = async () => {
    if (!signup) return;
    setIsActioning(true);
    try {
      await approveSignup({ signupId: signup._id });
      toast({
        title: t("approveSuccess"),
        description: t("approveSuccessDescription"),
      });
    } catch (err) {
      toast({
        title: t("actionError"),
        description: err instanceof Error ? err.message : t("actionErrorGeneric"),
        variant: "destructive",
      });
    }
    setIsActioning(false);
  };

  const handleReject = async () => {
    if (!signup || !rejectionReason.trim()) return;
    setIsActioning(true);
    try {
      await rejectSignup({
        signupId: signup._id,
        rejectionReason: rejectionReason.trim(),
      });
      toast({
        title: t("rejectSuccess"),
        description: t("rejectSuccessDescription"),
      });
      setShowRejectInput(false);
      setRejectionReason("");
    } catch (err) {
      toast({
        title: t("actionError"),
        description: err instanceof Error ? err.message : t("actionErrorGeneric"),
        variant: "destructive",
      });
    }
    setIsActioning(false);
  };

  if (signup === undefined) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 rounded-lg bg-stone-100 animate-pulse" />
        <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-4">
          <div className="h-4 w-48 rounded bg-stone-100 animate-pulse" />
          <div className="h-4 w-64 rounded bg-stone-100 animate-pulse" />
          <div className="h-4 w-40 rounded bg-stone-100 animate-pulse" />
        </div>
      </div>
    );
  }

  if (signup === null) {
    return (
      <div className="space-y-6">
        <Link
          href="/signups"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToList")}
        </Link>
        <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-stone-300 mb-4" />
          <p className="font-medium text-stone-500">{t("notFound")}</p>
        </div>
      </div>
    );
  }

  const ocrData = signup.ocrExtractedData as OcrData | null;
  const ocrEntries = ocrData
    ? Object.entries(ocrData).filter(
        ([, v]) => v !== null && v !== undefined && v !== ""
      )
    : [];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back button */}
      <Link
        href="/signups"
        className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToList")}
      </Link>

      {/* Signup info card */}
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-stone-900">{signup.fullName}</h1>
            <p className="text-sm text-stone-500 mt-1">{signup.email}</p>
            {signup.phone && (
              <p className="text-sm text-stone-400">{signup.phone}</p>
            )}
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
              statusStyles[signup.status] ?? ""
            }`}
          >
            {signup.status === "pending" && <Clock className="h-3 w-3" />}
            {signup.status === "approved" && <Check className="h-3 w-3" />}
            {signup.status === "rejected" && <X className="h-3 w-3" />}
            {t(signup.status as "pending" | "approved" | "rejected")}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">
              {t("planTier")}
            </p>
            <p className="text-sm font-semibold text-primary">
              {signup.planTier ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">
              {t("submittedAt")}
            </p>
            <p className="text-sm text-stone-700">
              {formatDate(new Date(signup._creationTime).toISOString(), locale)}
            </p>
          </div>
          {signup.reviewedAt && (
            <div>
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">
                {t("reviewedAt")}
              </p>
              <p className="text-sm text-stone-700">
                {formatDate(new Date(signup.reviewedAt).toISOString(), locale)}
              </p>
            </div>
          )}
        </div>

        {/* Rejection reason (if rejected) */}
        {signup.status === "rejected" && signup.rejectionReason && (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-red-400 mb-1">
              {t("rejectionReason")}
            </p>
            <p className="text-sm text-red-700">{signup.rejectionReason}</p>
          </div>
        )}
      </div>

      {/* Payment screenshot */}
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-stone-900 mb-4">
          {t("paymentScreenshot")}
        </h2>

        {paymentImageUrl ? (
          <div className="relative">
            <div
              className={`relative overflow-hidden rounded-lg border border-stone-200 cursor-pointer transition-all ${
                isImageZoomed ? "max-h-none" : "max-h-96"
              }`}
              onClick={() => setIsImageZoomed(!isImageZoomed)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={paymentImageUrl}
                alt={t("paymentScreenshotAlt")}
                className="w-full object-contain"
              />
              {!isImageZoomed && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent flex items-end justify-center pb-4">
                  <div className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm">
                    <ZoomIn className="h-3 w-3" />
                    {t("clickToZoom")}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : signup.paymentScreenshotId ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-stone-200 p-12">
            <div className="text-center">
              <ImageIcon className="h-8 w-8 mx-auto text-stone-300 mb-2" />
              <p className="text-xs text-stone-400">{t("loadingScreenshot")}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-stone-200 p-12">
            <div className="text-center">
              <ImageIcon className="h-8 w-8 mx-auto text-stone-300 mb-2" />
              <p className="text-xs text-stone-400">{t("noScreenshot")}</p>
            </div>
          </div>
        )}
      </div>

      {/* OCR extracted data */}
      {ocrEntries.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-stone-900 mb-4">
            {t("ocrData")}
          </h2>
          <div className="space-y-2">
            {ocrEntries.map(([key, value]) => (
              <div
                key={key}
                className="flex items-baseline gap-3 border-b border-stone-100 pb-2 last:border-0 last:pb-0"
              >
                <span className="shrink-0 w-24 text-xs font-medium uppercase tracking-wide text-primary">
                  {ocrFieldLabels[key] || key}
                </span>
                <span className="text-sm text-stone-900">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons — only show for pending signups */}
      {signup.status === "pending" && (
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-stone-900 mb-4">
            {t("actions")}
          </h2>

          {!showRejectInput ? (
            <div className="flex items-center gap-3">
              <button
                onClick={handleApprove}
                disabled={isActioning}
                className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {t("approve")}
              </button>
              <button
                onClick={() => setShowRejectInput(true)}
                disabled={isActioning}
                className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                {t("reject")}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1.5">
                  {t("rejectionReasonLabel")}
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={t("rejectionReasonPlaceholder")}
                  rows={3}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReject}
                  disabled={isActioning || !rejectionReason.trim()}
                  className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  {t("confirmReject")}
                </button>
                <button
                  onClick={() => {
                    setShowRejectInput(false);
                    setRejectionReason("");
                  }}
                  disabled={isActioning}
                  className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50"
                >
                  {t("cancelReject")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
