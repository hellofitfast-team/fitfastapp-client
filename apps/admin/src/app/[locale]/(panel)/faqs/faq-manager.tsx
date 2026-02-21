"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  HelpCircle,
  Plus,
  Trash2,
  Save,
  X,
  Pencil,
} from "lucide-react";

export function FaqManager() {
  const t = useTranslations("admin");
  const enFaqs = useQuery(api.faqs.getFAQs, { language: "en" });
  const arFaqs = useQuery(api.faqs.getFAQs, { language: "ar" });
  const createFAQ = useMutation(api.faqs.createFAQ);
  const updateFAQ = useMutation(api.faqs.updateFAQ);
  const deleteFAQ = useMutation(api.faqs.deleteFAQ);

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
      console.error("Failed to create FAQ:", err);
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
      console.error("Failed to update FAQ:", err);
    }
    setIsSaving(false);
  };

  const handleDelete = async (faqId: Id<"faqs">) => {
    try {
      await deleteFAQ({ faqId });
    } catch (err) {
      console.error("Failed to delete FAQ:", err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add new FAQ button */}
      <button
        onClick={() => setShowNew(!showNew)}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
      >
        {showNew ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {showNew ? "Cancel" : "Add FAQ"}
      </button>

      {/* New FAQ form */}
      {showNew && (
        <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-3">
          <div className="flex gap-2">
            <button
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
            placeholder="Question..."
            className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <textarea
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            placeholder="Answer..."
            rows={3}
            className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
          />
          <button
            onClick={handleCreate}
            disabled={isSaving || !newQuestion.trim() || !newAnswer.trim()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="h-3 w-3" />
            {t("save")}
          </button>
        </div>
      )}

      {/* FAQ list */}
      {allFaqs.length === 0 && !showNew ? (
        <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
          <HelpCircle className="h-12 w-12 mx-auto text-stone-300 mb-4" />
          <p className="font-medium text-stone-500">
            {t("noResults")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {allFaqs.map((faq) => (
            <div
              key={faq._id}
              className="rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-colors"
            >
              {editingId === faq._id ? (
                <div className="p-5 space-y-3">
                  <input
                    type="text"
                    value={editQuestion}
                    onChange={(e) => setEditQuestion(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <textarea
                    value={editAnswer}
                    onChange={(e) => setEditAnswer(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(faq._id)}
                      disabled={isSaving}
                      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      <Save className="h-3 w-3" />
                      {t("save")}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-2 rounded-lg border border-stone-200 px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-stone-900">{faq.question}</p>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                      {faq.answer}
                    </p>
                    <span className="inline-block mt-2 rounded-full border border-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-500">
                      {faq.language.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => handleEdit(faq)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:border-primary/30 hover:text-primary transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(faq._id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:border-red-300 hover:text-red-600 transition-colors"
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
