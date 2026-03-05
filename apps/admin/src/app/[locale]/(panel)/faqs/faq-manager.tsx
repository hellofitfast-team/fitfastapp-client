"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { createLogger } from "@fitfast/config/logger";
import { useToast } from "@/hooks/use-toast";

const log = createLogger("admin-faqs");
import { HelpCircle, Plus, Trash2, Save, X, Pencil } from "lucide-react";

export function FaqManager() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const { isAuthenticated } = useConvexAuth();
  const enFaqs = useQuery(api.faqs.getFAQs, isAuthenticated ? { language: "en" } : "skip");
  const arFaqs = useQuery(api.faqs.getFAQs, isAuthenticated ? { language: "ar" } : "skip");
  const createFAQ = useMutation(api.faqs.createFAQ);
  const updateFAQ = useMutation(api.faqs.updateFAQ);
  const deleteFAQ = useMutation(api.faqs.deleteFAQ);

  const { toast } = useToast();
  const allFaqs = [...(enFaqs ?? []), ...(arFaqs ?? [])];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newLang, setNewLang] = useState<"en" | "ar">("en");
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    setIsSaving(true);
    try {
      await createFAQ({
        question: newQuestion,
        answer: newAnswer,
        language: newLang,
        displayOrder: allFaqs.length,
      });
      setNewQuestion("");
      setNewAnswer("");
      setShowNew(false);
    } catch (err) {
      log.error({ err, language: newLang }, "Failed to create FAQ");
      toast({ title: t("faqSaveFailed"), variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handleEdit = (faq: { _id: Id<"faqs">; question: string; answer: string }) => {
    setEditingId(faq._id);
    setEditQuestion(faq.question);
    setEditAnswer(faq.answer);
  };

  const handleSave = async (faqId: Id<"faqs">) => {
    setIsSaving(true);
    try {
      await updateFAQ({ faqId, question: editQuestion, answer: editAnswer });
      setEditingId(null);
    } catch (err) {
      log.error({ err, faqId }, "Failed to update FAQ");
      toast({ title: t("faqSaveFailed"), variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handleDelete = async (faqId: Id<"faqs">) => {
    if (!window.confirm(t("confirmDeleteFaq"))) return;
    try {
      await deleteFAQ({ faqId });
    } catch (err) {
      log.error({ err, faqId }, "Failed to delete FAQ");
      toast({ title: t("faqDeleteFailed"), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Add new FAQ button */}
      <button
        type="button"
        onClick={() => setShowNew(!showNew)}
        className="bg-primary hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors"
      >
        {showNew ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {showNew ? t("cancel") : t("addFaq")}
      </button>

      {/* New FAQ form */}
      {showNew && (
        <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNewLang("en")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                newLang === "en"
                  ? "bg-primary text-white"
                  : "border border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setNewLang("ar")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                newLang === "ar"
                  ? "bg-primary text-white"
                  : "border border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
            >
              AR
            </button>
          </div>
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder={t("questionPlaceholder")}
            className="focus:ring-primary/20 focus:border-primary w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm font-medium text-stone-900 transition-all placeholder:text-stone-400 focus:ring-2 focus:outline-none"
          />
          <textarea
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            placeholder={t("answerPlaceholder")}
            rows={3}
            className="focus:ring-primary/20 focus:border-primary w-full resize-none rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-900 transition-all placeholder:text-stone-400 focus:ring-2 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={isSaving || !newQuestion.trim() || !newAnswer.trim()}
            className="bg-primary hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium text-white transition-colors disabled:opacity-50"
          >
            <Save className="h-3 w-3" />
            {t("save")}
          </button>
        </div>
      )}

      {/* FAQ list */}
      {allFaqs.length === 0 && !showNew ? (
        <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
          <HelpCircle className="mx-auto mb-4 h-12 w-12 text-stone-300" />
          <p className="font-medium text-stone-500">{t("noResults")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allFaqs.map((faq) => (
            <div
              key={faq._id}
              className="rounded-xl border border-stone-200 bg-white transition-colors hover:border-stone-300"
            >
              {editingId === faq._id ? (
                <div className="space-y-3 p-5">
                  <input
                    type="text"
                    value={editQuestion}
                    onChange={(e) => setEditQuestion(e.target.value)}
                    className="focus:ring-primary/20 focus:border-primary w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm font-medium text-stone-900 transition-all focus:ring-2 focus:outline-none"
                  />
                  <textarea
                    value={editAnswer}
                    onChange={(e) => setEditAnswer(e.target.value)}
                    rows={3}
                    className="focus:ring-primary/20 focus:border-primary w-full resize-none rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-900 transition-all focus:ring-2 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSave(faq._id)}
                      disabled={isSaving}
                      className="bg-primary hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium text-white transition-colors disabled:opacity-50"
                    >
                      <Save className="h-3 w-3" />
                      {t("save")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-2 rounded-lg border border-stone-200 px-4 py-2 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
                    >
                      {t("cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-900">{faq.question}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-stone-500">{faq.answer}</p>
                    <span className="mt-2 inline-block rounded-full border border-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-500">
                      {faq.language.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(faq)}
                      aria-label={tCommon("edit")}
                      className="hover:border-primary/30 hover:text-primary flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 text-stone-400 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(faq._id)}
                      aria-label={tCommon("delete")}
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 text-stone-400 transition-colors hover:border-red-300 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
