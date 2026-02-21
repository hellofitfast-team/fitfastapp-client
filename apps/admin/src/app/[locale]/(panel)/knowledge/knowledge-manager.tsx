"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  BookOpen,
  Plus,
  FileText,
  Upload,
  Trash2,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@fitfast/ui/cn";

export function KnowledgeManager() {
  const t = useTranslations("knowledge");
  const entries = useQuery(api.knowledgeBase.listKnowledgeEntries);
  const addTextEntry = useMutation(api.knowledgeBase.addTextEntry);
  const deleteEntry = useMutation(api.knowledgeBase.deleteKnowledgeEntry);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const processPdf = useAction(api.knowledgeBaseActions.processPdfUploadPublic);

  const [showAddText, setShowAddText] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAddText = async () => {
    if (!title.trim() || !content.trim()) return;
    setIsSubmitting(true);
    try {
      await addTextEntry({ title: title.trim(), content: content.trim() });
      setTitle("");
      setContent("");
      setShowAddText(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith(".pdf")) return;

    setIsUploading(true);
    try {
      const url = await generateUploadUrl({ purpose: "knowledge_pdf" });
      const uploadResult = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await uploadResult.json();

      await processPdf({
        title: file.name.replace(/\.pdf$/i, ""),
        storageId,
      });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (entryId: any) => {
    setDeletingId(entryId);
    try {
      await deleteEntry({ entryId });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowAddText(!showAddText)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("addText")}
        </button>
        <label
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-stone-50 transition-colors cursor-pointer",
            isUploading && "opacity-50 pointer-events-none",
          )}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {isUploading ? t("uploading") : t("uploadPdf")}
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handlePdfUpload}
            disabled={isUploading}
          />
        </label>
      </div>

      {/* Add Text Form */}
      {showAddText && (
        <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{t("addTextEntry")}</h3>
            <button
              onClick={() => setShowAddText(false)}
              className="text-stone-400 hover:text-stone-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            type="text"
            placeholder={t("titlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <textarea
            placeholder={t("contentPlaceholder")}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
          />
          <button
            onClick={handleAddText}
            disabled={isSubmitting || !title.trim() || !content.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("save")}
          </button>
        </div>
      )}

      {/* Entries List */}
      {entries === undefined ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-12 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-stone-400 mb-3" />
          <h3 className="font-semibold text-stone-600">{t("emptyTitle")}</h3>
          <p className="text-sm text-stone-500 mt-1 max-w-sm mx-auto">
            {t("emptyDescription")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry._id}
              className="rounded-xl border border-stone-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      entry.type === "pdf"
                        ? "bg-red-50 text-red-500"
                        : "bg-blue-50 text-blue-500",
                    )}
                  >
                    {entry.type === "pdf" ? (
                      <Upload className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">
                      {entry.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-stone-500 uppercase font-medium">
                        {entry.type}
                      </span>
                      {entry.content && (
                        <span className="text-xs text-stone-400">
                          {entry.content.split(/\s+/).length} {t("words")}
                        </span>
                      )}
                    </div>
                    {entry.content && (
                      <p className="text-xs text-stone-500 mt-2 line-clamp-2">
                        {entry.content.slice(0, 200)}
                        {entry.content.length > 200 ? "..." : ""}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(entry._id)}
                  disabled={deletingId === entry._id}
                  className="shrink-0 rounded-lg p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deletingId === entry._id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
