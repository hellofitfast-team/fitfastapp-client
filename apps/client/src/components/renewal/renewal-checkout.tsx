"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@fitfast/ui/button";
import { cn } from "@fitfast/ui/cn";
import { Upload, Check, Loader2, CreditCard, ImageIcon } from "lucide-react";
import { useParams } from "next/navigation";

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
  const [screenshotId, setScreenshotId] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // If user already has a pending renewal, show that state
  if (pendingRenewal) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Check className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t("pendingTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("alreadyPending")}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t("pendingTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("pendingMessage")}</p>
      </div>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return; // 5MB max

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
    setSubmitting(true);
    setError(null);
    try {
      await createRenewal({
        planId: selectedPlan,
        planTier: selectedTier,
        paymentScreenshotId: screenshotId as any,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
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
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            {t("selectPlan")}
          </h3>
          <div className="grid gap-3">
            {(plans ?? []).map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  onClick={() => {
                    setSelectedPlan(plan.id);
                    setSelectedTier(
                      plan.duration.toLowerCase().includes("quarter") || plan.duration.toLowerCase().includes("3")
                        ? "quarterly"
                        : "monthly"
                    );
                  }}
                  className={cn(
                    "relative flex flex-col rounded-xl border-2 p-4 text-start transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  {(plan.badge || plan.badgeAr) && (
                    <span className="absolute top-2 end-2 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-white">
                      {isAr ? plan.badgeAr || plan.badge : plan.badge}
                    </span>
                  )}
                  <span className="text-base font-bold">
                    {isAr ? plan.nameAr : plan.name}
                  </span>
                  <span className="text-lg font-bold text-primary mt-1">
                    {plan.price} {plan.currency}
                    <span className="text-xs font-normal text-muted-foreground ms-1">
                      / {isAr ? plan.durationAr : plan.duration}
                    </span>
                  </span>
                  <ul className="mt-2 space-y-1">
                    {(isAr ? plan.featuresAr : plan.features).map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-primary shrink-0" />
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
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {t("paymentMethod")}
          </h3>
          <div className="space-y-2">
            {(paymentMethods ?? []).map((pm, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card/50 p-3"
              >
                <p className="text-sm font-semibold">{pm.type}</p>
                <p className="text-sm text-muted-foreground">
                  {pm.accountName} — {pm.accountNumber}
                </p>
                {pm.instructions && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {pm.instructions}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Screenshot Upload */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          {t("uploadScreenshot")}
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
            "flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-4 text-sm text-muted-foreground transition-colors hover:border-primary/40",
            screenshotId && "border-primary/30 bg-primary/5"
          )}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : screenshotId ? (
            <>
              <Check className="h-4 w-4 text-primary" />
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
      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={submitting || !selectedPlan}
        className="w-full"
        size="lg"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin me-2" />
            {t("submitting")}
          </>
        ) : (
          t("submitRenewal")
        )}
      </Button>
    </div>
  );
}
