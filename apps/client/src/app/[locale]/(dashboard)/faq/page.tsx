"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Search, ChevronDown, ChevronUp, MessageSquarePlus } from "lucide-react";
import { Link } from "@fitfast/i18n/navigation";
import { Skeleton } from "@fitfast/ui/skeleton";
import { cn } from "@fitfast/ui/cn";

const faqKeys = [
  "checkInFrequency", "changeMeals", "missWorkout", "trackProgress",
  "newPlanTiming", "contactCoach", "paymentMethods", "changeLanguage",
] as const;

export default function FAQPage() {
  const t = useTranslations("faq");
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const dbFaqs = useQuery(api.faqs.getFAQs, { language: locale as "en" | "ar" });
  const isLoading = dbFaqs === undefined;

  const faqs = dbFaqs && dbFaqs.length > 0
    ? dbFaqs.map((faq) => ({ key: faq._id, question: faq.question, answer: faq.answer }))
    : !isLoading
      ? faqKeys.map((key) => ({ key, question: t(`questions.${key}.q`), answer: t(`questions.${key}.a`) }))
      : [];

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="px-4 py-6 space-y-5 max-w-3xl mx-auto lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 ps-10 pe-4 rounded-lg border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
        />
      </div>

      {/* FAQ List */}
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFaqs.map((faq, index) => (
            <div
              key={faq.key}
              className="rounded-xl border border-border bg-card overflow-hidden transition-colors hover:bg-neutral-50"
            >
              <button
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                className="w-full p-4 flex items-start justify-between gap-3 text-start"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors",
                    expandedIndex === index
                      ? "bg-primary text-white"
                      : "bg-neutral-100 text-muted-foreground"
                  )}>
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <span className="font-medium text-sm pt-1">{faq.question}</span>
                </div>
                {expandedIndex === index ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
                )}
              </button>
              {expandedIndex === index && (
                <div className="px-4 pb-4 pt-0">
                  <div className="ms-11 rounded-lg bg-neutral-50 p-3.5">
                    <p className="text-sm leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredFaqs.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Search className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 font-medium">{t("noResults")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("noResultsHint")}</p>
        </div>
      )}

      {/* Still Need Help */}
      <div className="rounded-xl bg-primary/5 border border-primary/20 p-6 text-center">
        <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-primary/10 mb-3">
          <MessageSquarePlus className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">{t("stillNeedHelp")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("stillNeedHelpHint")}</p>
        <Link href="/tickets">
          <button className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-all active:scale-[0.97]">
            {t("contactSupport")}
          </button>
        </Link>
      </div>
    </div>
  );
}
