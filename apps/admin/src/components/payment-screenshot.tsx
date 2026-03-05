"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ImageIcon, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@fitfast/ui/dialog";
import { useTranslations } from "next-intl";

interface PaymentScreenshotProps {
  storageId: Id<"_storage">;
  /** "compact" = h-40 full-width (client detail), "card" = w-64 fixed (signups table) */
  variant?: "compact" | "card";
}

export function PaymentScreenshot({ storageId, variant = "compact" }: PaymentScreenshotProps) {
  const t = useTranslations("admin");
  const url = useQuery(api.storage.getFileUrl, { storageId });
  const [open, setOpen] = useState(false);

  if (url === undefined) {
    if (variant === "card") {
      return (
        <div className="flex w-64 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 p-8">
          <Loader2 className="h-6 w-6 animate-spin text-stone-300" />
        </div>
      );
    }
    return <div className="h-40 w-full animate-pulse rounded-lg bg-stone-100" />;
  }

  if (!url) {
    if (variant === "card") {
      return (
        <div className="flex w-64 shrink-0 items-center justify-center rounded-lg border border-dashed border-stone-200 p-8">
          <div className="text-center">
            <ImageIcon className="mx-auto mb-2 h-8 w-8 text-stone-300" />
            <p className="text-xs text-stone-400">{t("imageUnavailable")}</p>
          </div>
        </div>
      );
    }
    return <p className="text-xs text-stone-400">{t("imageUnavailable")}</p>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {variant === "card" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hover:border-primary/40 w-64 shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-stone-200 transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={t("paymentScreenshot")}
            className="h-48 w-full bg-stone-50 object-contain"
          />
        </button>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={t("paymentScreenshot")}
          className="mx-auto max-h-40 max-w-full cursor-pointer rounded-lg border border-stone-200 object-contain transition-opacity hover:opacity-90"
          onClick={() => setOpen(true)}
        />
      )}
      <DialogContent className="max-w-fit border-none bg-transparent p-0 shadow-none">
        <DialogTitle className="sr-only">{t("paymentScreenshot")}</DialogTitle>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={t("paymentScreenshot")}
          className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        />
      </DialogContent>
    </Dialog>
  );
}
