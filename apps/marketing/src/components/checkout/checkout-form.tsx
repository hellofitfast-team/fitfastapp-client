"use client";

import { useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTranslations } from "next-intl";
import { Button } from "@fitfast/ui/button";
import { Input } from "@fitfast/ui/input";
import { Label } from "@fitfast/ui/label";
import { cn } from "@fitfast/ui/cn";
import { PaymentInstructions } from "./payment-instructions";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";

export interface SelectedPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration: string;
}

interface CheckoutFormProps {
  selectedPlan: SelectedPlan;
  onSuccess: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const durationToTier: Record<string, "monthly" | "quarterly"> = {
  "1 month": "monthly",
  "3 months": "quarterly",
};

function makeCheckoutSchema(
  invalidPhoneMsg: string,
  refRequiredMsg: string,
  amountRequiredMsg: string,
) {
  return z.object({
    fullName: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().regex(/^\+?[0-9\s-]{10,15}$/, invalidPhoneMsg),
    transferReferenceNumber: z.string().min(1, refRequiredMsg),
    transferAmount: z.string().min(1, amountRequiredMsg),
  });
}

type CheckoutSchema = ReturnType<typeof makeCheckoutSchema>;

type CheckoutFormValues = z.infer<CheckoutSchema>;

export function CheckoutForm({ selectedPlan, onSuccess }: CheckoutFormProps) {
  const t = useTranslations("checkout");
  const checkoutSchema = makeCheckoutSchema(
    t("invalidPhone"),
    t("refRequired"),
    t("amountRequired"),
  );
  const createSignup = useMutation(api.pendingSignups.createSignup);

  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
  });

  const handleFile = useCallback(
    (file: File) => {
      setFileError(null);

      if (!file.type.startsWith("image/")) {
        setFileError(t("invalidFileType"));
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setFileError(t("fileTooLarge"));
        return;
      }

      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [t],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const removeScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (data: CheckoutFormValues) => {
    setSubmitError(null);
    setFileError(null);

    // Payment screenshot is required
    if (!screenshotFile) {
      setFileError(t("screenshotRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload screenshot (required — validated above)
      const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
      if (!convexSiteUrl) {
        throw new Error("Convex site URL not configured");
      }

      const urlResponse = await fetch(`${convexSiteUrl}/marketing/upload-url`, {
        method: "POST",
      });

      if (!urlResponse.ok) {
        throw new Error(`Failed to get upload URL: ${urlResponse.statusText}`);
      }

      const { uploadUrl } = (await urlResponse.json()) as { uploadUrl: string };
      if (!uploadUrl || typeof uploadUrl !== "string") throw new Error("Invalid upload response");

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: screenshotFile,
        headers: {
          "Content-Type": screenshotFile.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const uploadResult = (await uploadResponse.json()) as { storageId: string };
      const { storageId } = uploadResult;
      if (!storageId || typeof storageId !== "string") throw new Error("Invalid storage response");

      // Submit signup mutation
      const planTier = durationToTier[selectedPlan.duration];
      if (!planTier) {
        console.warn(`Unknown plan duration: ${selectedPlan.duration}`); // Sentry captures this
      }
      await createSignup({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        planId: selectedPlan.id,
        ...(planTier ? { planTier } : {}),
        transferReferenceNumber: data.transferReferenceNumber,
        transferAmount: data.transferAmount,
        paymentScreenshotId: storageId as Parameters<typeof createSignup>[0]["paymentScreenshotId"],
      });

      onSuccess();
    } catch (err) {
      console.error("Checkout error:", err); // Sentry captures this
      setSubmitError(t("submitError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Full Name */}
      <div className="space-y-1.5">
        <Label htmlFor="fullName" className="text-sm font-medium text-[var(--color-foreground)]">
          {t("fullName")}
        </Label>
        <Input
          id="fullName"
          {...register("fullName")}
          placeholder={t("fullNamePlaceholder")}
          className={cn(errors.fullName && "border-red-500 focus-visible:ring-red-500")}
          disabled={isSubmitting}
        />
        {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium text-[var(--color-foreground)]">
          {t("email")}
        </Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          placeholder={t("emailPlaceholder")}
          className={cn(errors.email && "border-red-500 focus-visible:ring-red-500")}
          disabled={isSubmitting}
        />
        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <Label htmlFor="phone" className="text-sm font-medium text-[var(--color-foreground)]">
          {t("phone")}
        </Label>
        <Input
          id="phone"
          type="tel"
          {...register("phone")}
          placeholder={t("phonePlaceholder")}
          className={cn(errors.phone && "border-red-500 focus-visible:ring-red-500")}
          disabled={isSubmitting}
        />
        {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
      </div>

      {/* Payment Instructions */}
      <PaymentInstructions />

      {/* Transfer Reference Number */}
      <div className="space-y-1.5">
        <Label
          htmlFor="transferReferenceNumber"
          className="text-sm font-medium text-[var(--color-foreground)]"
        >
          {t("transferReferenceNumber")}
          <span className="ms-1 text-red-500">*</span>
        </Label>
        <Input
          id="transferReferenceNumber"
          {...register("transferReferenceNumber")}
          placeholder={t("transferReferenceNumberPlaceholder")}
          className={cn(
            errors.transferReferenceNumber && "border-red-500 focus-visible:ring-red-500",
          )}
          disabled={isSubmitting}
        />
        {errors.transferReferenceNumber && (
          <p className="text-xs text-red-500">{errors.transferReferenceNumber.message}</p>
        )}
      </div>

      {/* Transfer Amount */}
      <div className="space-y-1.5">
        <Label
          htmlFor="transferAmount"
          className="text-sm font-medium text-[var(--color-foreground)]"
        >
          {t("transferAmount")}
          <span className="ms-1 text-red-500">*</span>
        </Label>
        <Input
          id="transferAmount"
          {...register("transferAmount")}
          placeholder={t("transferAmountPlaceholder")}
          className={cn(errors.transferAmount && "border-red-500 focus-visible:ring-red-500")}
          disabled={isSubmitting}
        />
        {errors.transferAmount && (
          <p className="text-xs text-red-500">{errors.transferAmount.message}</p>
        )}
      </div>

      {/* Screenshot Upload */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-[var(--color-foreground)]">
          {t("uploadScreenshot")}
          <span className="ms-1 text-red-500">*</span>
        </Label>

        {screenshotPreview ? (
          <div className="relative overflow-hidden rounded-xl border border-[var(--color-border)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screenshotPreview}
              alt="Payment screenshot preview"
              className="max-h-48 w-full bg-[var(--color-card)] object-contain"
            />
            <button
              type="button"
              onClick={removeScreenshot}
              className="absolute end-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
              aria-label="Remove screenshot"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors",
              isDragging
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/60 hover:bg-[var(--color-primary)]/3",
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
              {isDragging ? (
                <ImageIcon className="h-5 w-5 text-[var(--color-primary)]" />
              ) : (
                <Upload className="h-5 w-5 text-[var(--color-primary)]" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--color-foreground)]">
                <span className="hidden sm:inline">{t("dragDrop")}</span>
                <span className="sm:hidden">{t("tapUpload")}</span>
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                {t("uploadHint")}
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
        />

        {fileError && <p className="text-xs text-red-500">{fileError}</p>}
      </div>

      {/* Submit Error */}
      {submitError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-600">{submitError}</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-xl bg-[var(--color-primary)] font-semibold text-white hover:bg-[var(--color-primary)]/90"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("submitting")}
          </span>
        ) : (
          t("submit")
        )}
      </Button>
    </form>
  );
}
