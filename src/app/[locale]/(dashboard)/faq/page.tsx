"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Search, ChevronDown, ChevronUp, HelpCircle, MessageSquarePlus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

interface Faq {
  id: string;
  question: string;
  answer: string;
  language: string;
  display_order: number;
}

const faqKeys = [
  "checkInFrequency",
  "changeMeals",
  "missWorkout",
  "trackProgress",
  "newPlanTiming",
  "contactCoach",
  "paymentMethods",
  "changeLanguage",
] as const;

export default function FAQPage() {
  const t = useTranslations("faq");
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [dbFaqs, setDbFaqs] = useState<Faq[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFaqs = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("faqs")
        .select("id,question,answer,language,display_order")
        .eq("language", locale)
        .order("display_order", { ascending: true });

      setDbFaqs(data ?? []);
      setIsLoading(false);
    };

    fetchFaqs();
  }, [locale]);

  // Use DB FAQs if available, otherwise fall back to translations
  const faqs =
    dbFaqs.length > 0
      ? dbFaqs.map((faq) => ({
          key: faq.id,
          question: faq.question,
          answer: faq.answer,
        }))
      : faqKeys.map((key) => ({
          key,
          question: t(`questions.${key}.q`),
          answer: t(`questions.${key}.a`),
        }));

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-4 border-black bg-black p-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="flex h-12 w-12 items-center justify-center bg-[#00FF94]">
            <HelpCircle className="h-6 w-6 text-black" />
          </div>
          <h1 className="text-3xl font-black text-[#FFFEF5] tracking-tight">
            {t("title").toUpperCase()}
          </h1>
        </div>
        <p className="font-mono text-xs tracking-[0.2em] text-[#00FF94]">
          {t("subtitle").toUpperCase()}
        </p>
      </div>

      {/* Search */}
      <div className="border-4 border-black bg-[#FFFEF5] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="relative flex items-center">
          <div className="flex h-14 w-14 items-center justify-center border-e-4 border-black bg-[#FF3B00]">
            <Search className="h-6 w-6 text-white" />
          </div>
          <input
            type="text"
            placeholder={t("searchPlaceholder").toUpperCase()}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 h-14 px-4 bg-transparent font-mono text-sm uppercase placeholder:text-neutral-400 focus:outline-none text-black"
          />
        </div>
      </div>

      {/* FAQ List */}
      {isLoading ? (
        <div className="border-4 border-black bg-[#FFFEF5] p-12 text-center">
          <div className="h-8 w-8 mx-auto border-4 border-black border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="space-y-0">
          {filteredFaqs.map((faq, index) => (
            <div
              key={faq.key}
              className="border-4 border-black -mt-1 first:mt-0 bg-[#FFFEF5] hover:bg-neutral-50 transition-colors"
            >
              <button
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                className="w-full p-5 flex items-start justify-between gap-4 text-start"
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center border-4 border-black ${
                    expandedIndex === index ? "bg-[#FF3B00] text-white" : "bg-[#FFFEF5] text-black"
                  }`}>
                    <span className="font-black text-sm">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <span className="font-black text-lg tracking-tight pt-1 text-black">
                    {faq.question.toUpperCase()}
                  </span>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center border-4 border-black ${
                  expandedIndex === index ? "bg-black text-[#FFFEF5]" : "bg-[#FFFEF5] text-black"
                }`}>
                  {expandedIndex === index ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              </button>
              {expandedIndex === index && (
                <div className="px-5 pb-5 pt-0">
                  <div className="ms-14 border-4 border-black bg-neutral-100 p-4">
                    <p className="font-mono text-sm leading-relaxed text-black">{faq.answer}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredFaqs.length === 0 && (
        <div className="border-4 border-black bg-[#FFFEF5] p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-neutral-300" />
          <p className="mt-4 font-black text-xl text-black">{t("noResults").toUpperCase()}</p>
          <p className="mt-2 font-mono text-xs text-neutral-500">
            {t("noResultsHint").toUpperCase()}
          </p>
        </div>
      )}

      {/* Still Need Help */}
      <div className="border-4 border-black bg-[#FF3B00] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="p-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center bg-black mb-4">
            <MessageSquarePlus className="h-8 w-8 text-[#00FF94]" />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">
            {t("stillNeedHelp").toUpperCase()}
          </h3>
          <p className="mt-2 font-mono text-xs tracking-[0.15em] text-white/80">
            {t("stillNeedHelpHint").toUpperCase()}
          </p>
          <Link href="/tickets">
            <button className="mt-6 h-14 px-8 bg-black text-[#FFFEF5] font-black text-lg uppercase tracking-wide hover:bg-[#FFFEF5] hover:text-black transition-colors">
              {t("contactSupport").toUpperCase()}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
