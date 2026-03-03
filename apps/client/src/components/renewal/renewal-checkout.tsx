"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@fitfast/ui/button";
import { cn } from "@fitfast/ui/cn";
import { Upload, Check, Loader2, CreditCard, ImageIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { MAX_UPLOAD_SIZE_BYTES } from "@/lib/constants";
import type { Id } from "@/convex/_generated/dataModel";

export function RenewalCheckout() {
  const t = useTranslations("subscription.renewal");
  const params = useParams();
  const locale = params.locale as string;

  const plans = useQuery(api.systemConfig.getPlans);
  const paymentMethods = useQuery(api.systemConfig.getPaymentMethods);
  const pendingRenewal = useQuery(api.pendingSignups.getMyPendingRenewal);
  const createRenewal = useMutation(api.pendingSignups.createRenewalSignup);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<"monthly" | "quarterly" | null>(null);
  const [transferReferenceNumber, setTransferReferenceNumber] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [screenshotId, setScreenshotId] = useState<Id<"_storage"> | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // If user already has a pending renewal, show that state
  if (pendingRenewal) {
    return (
      <div className="border-border bg-card rounded-xl border p-6 text-center">
        <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          <Check className="text-primary h-6 w-6" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">{t("pendingTitle")}</h3>
        <p className="text-muted-foreground text-sm">{t("alreadyPending")}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="border-border bg-card rounded-xl border p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">{t("pendingTitle")}</h3>
        <p className="text-muted-foreground text-sm">{t("pendingMessage")}</p>
      </div>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_SIZE_BYTES) return;

    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({ purpose: "payment_proof" });
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json();
      setScreenshotId(storageId);
      setScreenshotName(file.name);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlan || !selectedTier) {
      setError(t("selectPlanFirst"));
      return;
    }
    if (!transferReferenceNumber.trim()) {
      setError(t("refRequired"));
      return;
    }
    if (!transferAmount.trim()) {
      setError(t("amountRequired"));
      return;
    }
    if (!screenshotId) {
      setError(t("screenshotRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createRenewal({
        planId: selectedPlan,
        planTier: selectedTier,
        transferReferenceNumber: transferReferenceNumber.trim(),
        transferAmount: transferAmount.trim(),
        paymentScreenshotId: screenshotId,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const isAr = locale === "ar";

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{t("title")}</h2>

      {/* Plan Selection */}
      {plans !== undefined && (
        <div>
          <h3 className="text-muted-foreground mb-3 text-sm font-semibold">{t("selectPlan")}</h3>
          <div className="grid gap-3">
            {(plans ?? []).map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  onClick={() => {
                    setSelectedPlan(plan.id);
                    setSelectedTier(
                      plan.duration.toLowerCase().includes("quarter") ||
                        plan.duration.toLowerCase().includes("3")
                        ? "quarterly"
                        : "monthly",
                    );
                  }}
                  className={cn(
                    "relative flex flex-col rounded-xl border-2 p-4 text-start transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  {(plan.badge || plan.badgeAr) && (
                    <span className="bg-primary absolute end-2 top-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white">
                      {isAr ? plan.badgeAr || plan.badge : plan.badge}
                    </span>
                  )}
                  <span className="text-base font-bold">{isAr ? plan.nameAr : plan.name}</span>
                  <span className="text-primary mt-1 text-lg font-bold">
                    {plan.price} {plan.currency}
                    <span className="text-muted-foreground ms-1 text-xs font-normal">
                      / {isAr ? plan.durationAr : plan.duration}
                    </span>
                  </span>
                  <ul className="mt-2 space-y-1">
                    {(isAr ? plan.featuresAr : plan.features).map((f, i) => (
                      <li
                        key={i}
                        className="text-muted-foreground flex items-center gap-1.5 text-xs"
                      >
                        <Check className="text-primary h-3 w-3 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment Methods */}
      {paymentMethods !== undefined && (paymentMethods ?? []).length > 0 && (
        <div>
          <h3 className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="h-4 w-4" />
            {t("paymentMethod")}
          </h3>
          <div className="space-y-2">
            {(paymentMethods ?? []).map((pm, i) => (
              <div key={i} className="border-border bg-card/50 rounded-lg border p-3">
                <p className="text-sm font-semibold">{pm.type}</p>
                <p className="text-muted-foreground text-sm">
                  {pm.accountName} — {pm.accountNumber}
                </p>
                {pm.instructions && (
                  <p className="text-muted-foreground mt-1 text-xs">{pm.instructions}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transfer Reference Number */}
      <div>
        <label className="text-muted-foreground mb-2 block text-sm font-semibold">
          {t("transferReferenceNumber")} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={transferReferenceNumber}
          onChange={(e) => setTransferReferenceNumber(e.target.value)}
          placeholder={t("transferReferenceNumberPlaceholder")}
          className="border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2.5 text-sm transition-all focus:ring-2 focus:outline-none"
        />
      </div>

      {/* Transfer Amount */}
      <div>
        <label className="text-muted-foreground mb-2 block text-sm font-semibold">
          {t("transferAmount")} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={transferAmount}
          onChange={(e) => setTransferAmount(e.target.value)}
          placeholder={t("transferAmountPlaceholder")}
          className="border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2.5 text-sm transition-all focus:ring-2 focus:outline-none"
        />
      </div>

      {/* Screenshot Upload */}
      <div>
        <h3 className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-semibold">
          <ImageIcon className="h-4 w-4" />
          {t("uploadScreenshot")} <span className="text-red-500">*</span>
        </h3>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={cn(
            "border-border text-muted-foreground hover:border-primary/40 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-sm transition-colors",
            screenshotId && "border-primary/30 bg-primary/5",
          )}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : screenshotId ? (
            <>
              <Check className="text-primary h-4 w-4" />
              <span className="text-primary font-medium">{screenshotName}</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              {t("uploadHint")}
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && <p className="text-center text-sm text-red-500">{error}</p>}

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={
          submitting ||
          !selectedPlan ||
          !transferReferenceNumber.trim() ||
          !transferAmount.trim() ||
          !screenshotId
        }
        className="w-full"
        size="lg"
      >
        {submitting ? (
          <>
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
            {t("submitting")}
          </>
        ) : (
          t("submitRenewal")
        )}
      </Button>
    </div>
  );
}
