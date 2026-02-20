"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@fitfast/ui/drawer";
import { useTranslations } from "next-intl";
import { CheckoutForm } from "./checkout-form";
import type { SelectedPlan } from "./checkout-form";
import { X } from "lucide-react";

interface CheckoutDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlan: SelectedPlan | null;
  onSuccess: () => void;
}

export function CheckoutDrawer({
  open,
  onOpenChange,
  selectedPlan,
  onSuccess,
}: CheckoutDrawerProps) {
  const t = useTranslations("checkout");

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh] flex flex-col">
        {/* Header */}
        <DrawerHeader className="flex-shrink-0 relative px-6 pt-6 pb-4 border-b border-[var(--color-border)]">
          <div className="pe-8">
            <DrawerTitle className="text-lg font-bold text-[var(--color-foreground)] text-start">
              {t("formTitle")}
            </DrawerTitle>
            {selectedPlan && (
              <DrawerDescription className="mt-1 text-sm text-[var(--color-muted-foreground)] text-start">
                {selectedPlan.name} — {selectedPlan.price.toLocaleString("en-EG")}{" "}
                {selectedPlan.currency} / {selectedPlan.duration}
              </DrawerDescription>
            )}
          </div>

          {/* Close button */}
          <DrawerClose asChild>
            <button
              className="absolute top-5 end-5 w-8 h-8 rounded-full bg-[var(--color-muted)] flex items-center justify-center text-[var(--color-muted-foreground)] hover:bg-[var(--color-border)] transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {selectedPlan && (
            <CheckoutForm
              selectedPlan={selectedPlan}
              onSuccess={onSuccess}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
