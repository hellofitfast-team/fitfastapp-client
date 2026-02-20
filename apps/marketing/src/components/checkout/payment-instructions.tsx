"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTranslations } from "next-intl";
import { Skeleton } from "@fitfast/ui/skeleton";
import { Wallet } from "lucide-react";

export function PaymentInstructions() {
  const t = useTranslations("checkout");
  const paymentMethods = useQuery(api.systemConfig.getPaymentMethods);
  const isLoading = paymentMethods === undefined;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-[var(--color-foreground)]">
        {t("paymentInstructions")}
      </p>

      {paymentMethods.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {t("noPaymentMethods")}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
          {paymentMethods.map((method, idx) => (
            <div key={idx} className="p-4 flex items-start gap-3">
              <div className="mt-0.5 w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4 text-[var(--color-primary)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--color-foreground)]">
                  {method.type}
                </p>
                <p className="text-sm text-[var(--color-foreground)]">
                  {method.accountName}
                </p>
                <p className="text-sm font-mono text-[var(--color-primary)] mt-0.5">
                  {method.accountNumber}
                </p>
                {method.instructions && (
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                    {method.instructions}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
