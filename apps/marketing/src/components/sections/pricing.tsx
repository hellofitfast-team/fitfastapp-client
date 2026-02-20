"use client";

import { useTranslations, useLocale } from "next-intl";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@fitfast/ui/button";
import { Skeleton } from "@fitfast/ui/skeleton";
import { Check } from "lucide-react";
import { cn } from "@fitfast/ui/cn";

interface PricingProps {
  onSelectPlan?: (planId: string) => void;
}

function PricingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 space-y-4"
        >
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-4 w-20" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function Pricing({ onSelectPlan }: PricingProps) {
  const t = useTranslations("landing");
  const locale = useLocale();
  const plans = useQuery(api.systemConfig.getPlans);

  const isLoading = plans === undefined;
  const isEmpty = !isLoading && plans.length === 0;

  return (
    <section id="pricing" className="py-16 px-4 bg-[var(--color-background)] scroll-mt-16">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-foreground)] mb-3">
            {t("pricingTitle")}
          </h2>
          <p className="text-[var(--color-muted-foreground)] text-base sm:text-lg max-w-xl mx-auto">
            {t("pricingSubtitle")}
          </p>
        </div>

        {/* Loading skeleton */}
        {isLoading && <PricingSkeleton />}

        {/* Empty state */}
        {isEmpty && (
          <div className="text-center py-16 text-[var(--color-muted-foreground)]">
            {t("plansComing")}
          </div>
        )}

        {/* Pricing cards */}
        {!isLoading && !isEmpty && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const badge = locale === "ar" ? plan.badgeAr : plan.badge;
              const name = locale === "ar" ? plan.nameAr : plan.name;
              const duration = locale === "ar" ? plan.durationAr : plan.duration;
              const features = locale === "ar" ? plan.featuresAr : plan.features;
              const isHighlighted = Boolean(badge);

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col rounded-2xl border bg-[var(--color-card)] p-6 transition-shadow hover:shadow-lg",
                    isHighlighted
                      ? "border-[var(--color-primary)] shadow-md ring-1 ring-[var(--color-primary)]/20"
                      : "border-[var(--color-border)]"
                  )}
                >
                  {/* Badge */}
                  {badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 rounded-full bg-[var(--color-primary)] text-white text-xs font-semibold whitespace-nowrap">
                        {badge === "Most Popular"
                          ? t("mostPopular")
                          : badge === "Best Value"
                          ? t("bestValue")
                          : badge}
                      </span>
                    </div>
                  )}

                  {/* Plan name */}
                  <h3 className="text-xl font-bold text-[var(--color-foreground)] mb-2 mt-1">
                    {name}
                  </h3>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-extrabold text-[var(--color-primary)]">
                      {plan.price.toLocaleString("en-EG")}
                    </span>
                    <span className="text-sm font-medium text-[var(--color-muted-foreground)] ms-1">
                      {plan.currency}
                    </span>
                  </div>

                  {/* Duration */}
                  <p className="text-sm text-[var(--color-muted-foreground)] mb-6">
                    {duration}
                  </p>

                  {/* Features */}
                  <ul className="flex-1 space-y-2 mb-6">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-[var(--color-foreground)]">
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    className={cn(
                      "w-full",
                      isHighlighted
                        ? "bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white"
                        : "variant-outline"
                    )}
                    variant={isHighlighted ? "default" : "outline"}
                    onClick={() => onSelectPlan?.(plan.id)}
                  >
                    {t("choosePlan")}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
