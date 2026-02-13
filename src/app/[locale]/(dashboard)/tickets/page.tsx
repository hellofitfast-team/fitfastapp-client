"use client";

import { useState, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { MessageSquarePlus, Clock, CheckCircle2, MessageSquare, ChevronDown, Upload, Send, Loader2 } from "lucide-react";
import { useTickets } from "@/hooks/use-tickets";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export default function TicketsPage() {
  const t = useTranslations("tickets");
  const tEmpty = useTranslations("emptyStates");
  const { tickets, isLoading, error, createTicket, isCreating } = useTickets();
  const { user } = useAuth();

  // Form state
  const [subject, setSubject] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"meal_issue" | "workout_issue" | "technical" | "bug_report" | "other">("meal_issue");
  const [description, setDescription] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadScreenshot = async (): Promise<string | undefined> => {
    if (!screenshotFile || !user) return undefined;
    setIsUploading(true);
    const supabase = createClient();
    const fileName = `${user.id}/${Date.now()}-${screenshotFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from("ticket-screenshots")
      .upload(fileName, screenshotFile);
    setIsUploading(false);
    if (uploadError) return undefined;
    const { data: { publicUrl } } = supabase.storage
      .from("ticket-screenshots")
      .getPublicUrl(fileName);
    return publicUrl;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      return;
    }

    const screenshotUrl = await uploadScreenshot();

    const result = await createTicket({
      subject: subject.trim(),
      category: selectedCategory,
      description: description.trim() || undefined,
      screenshot_url: screenshotUrl,
    });

    if (result) {
      // Reset form on success
      setSubject("");
      setDescription("");
      setSelectedCategory("meal_issue");
      setScreenshotFile(null);
      setSubmitSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <Clock className="h-5 w-5" />;
      case "coach_responded":
        return <MessageSquare className="h-5 w-5" />;
      case "closed":
        return <CheckCircle2 className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "open":
        return "border-primary bg-primary/10 text-primary";
      case "coach_responded":
        return "border-primary bg-primary/10 text-black";
      case "closed":
        return "border-success-500 bg-success-500/10 text-success-500";
      default:
        return "";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-4 border-black bg-black p-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="flex h-12 w-12 items-center justify-center bg-primary">
            <MessageSquarePlus className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-cream">
            {t("title").toUpperCase()}
          </h1>
        </div>
        <p className="font-mono text-xs tracking-[0.2em] text-primary">
          {t("myTickets").toUpperCase()}
        </p>
      </div>

      {/* Success Message */}
      {submitSuccess && (
        <div className="border-4 border-black bg-primary p-4 animate-fade-in">
          <p className="font-black text-center text-black">
            TICKET SUBMITTED SUCCESSFULLY!
          </p>
        </div>
      )}

      {/* New Ticket Form */}
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-primary p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-black">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
          </div>
          <h2 className="font-black text-xl text-black tracking-tight">
            {t("newTicket").toUpperCase()}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block font-bold text-xs uppercase tracking-wide mb-2">
              {t("subject")}
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("subjectPlaceholder").toUpperCase()}
              className="w-full h-12 px-4 border-4 border-black bg-cream font-mono text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:bg-white transition-colors"
              required
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="block font-bold text-xs uppercase tracking-wide mb-2">
              {t("category")}
            </label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as typeof selectedCategory)}
                className="w-full h-12 px-4 pr-10 border-4 border-black bg-cream font-bold text-sm uppercase appearance-none cursor-pointer focus:outline-none focus:bg-white transition-colors"
                disabled={isCreating}
              >
                <option value="meal_issue">{t("categories.mealIssue").toUpperCase()}</option>
                <option value="workout_issue">{t("categories.workoutIssue").toUpperCase()}</option>
                <option value="technical">{t("categories.technical").toUpperCase()}</option>
                <option value="bug_report">{t("categories.bugReport").toUpperCase()}</option>
                <option value="other">{t("categories.other").toUpperCase()}</option>
              </select>
              <ChevronDown className="absolute end-4 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block font-bold text-xs uppercase tracking-wide mb-2">
              {t("description")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder").toUpperCase()}
              className="w-full min-h-[120px] p-4 border-4 border-black bg-cream font-mono text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:bg-white transition-colors resize-none"
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="block font-bold text-xs uppercase tracking-wide mb-2">
              {t("screenshot")} (OPTIONAL)
            </label>
            <label className="flex items-center justify-center h-20 border-4 border-dashed border-black bg-neutral-100 cursor-pointer hover:bg-neutral-200 transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && file.size <= 5 * 1024 * 1024) {
                    setScreenshotFile(file);
                  }
                }}
                disabled={isCreating || isUploading}
              />
              <div className="flex items-center gap-3 text-neutral-500">
                <Upload className="h-5 w-5" />
                <span className="font-mono text-xs uppercase">
                  {screenshotFile ? screenshotFile.name.toUpperCase() : t("uploadHint").toUpperCase()}
                </span>
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={isCreating || isUploading || !subject.trim()}
            className="w-full h-14 bg-black hover:bg-primary text-cream font-black text-lg uppercase tracking-wide transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                SUBMITTING...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                {t("submitTicket").toUpperCase()}
              </>
            )}
          </button>
        </form>
      </div>

      {/* Existing Tickets */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-1 flex-1 bg-black" />
          <h2 className="font-black text-xl uppercase">{t("myTickets")}</h2>
          <div className="h-1 flex-1 bg-black" />
        </div>

        {isLoading ? (
          <div className="space-y-0">
            {[0, 1, 2].map((i) => (
              <div key={i} className="border-4 border-black -mt-1 first:mt-0 bg-cream p-5">
                <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
                  <div className="flex items-start gap-4 flex-1">
                    <Skeleton className="h-12 w-12 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="border-4 border-black bg-primary/10 p-6 text-center">
            <p className="font-black text-error-500">ERROR LOADING TICKETS</p>
            <p className="font-mono text-xs mt-2 text-neutral-600">{error}</p>
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title={tEmpty("noTickets.title")}
            description={tEmpty("noTickets.description")}
            action={{
              label: tEmpty("noTickets.action"),
              onClick: () => {
                // Scroll to the new ticket form at top of page
                window.scrollTo({ top: 0, behavior: "smooth" });
              },
            }}
          />
        ) : (
          <div className="space-y-0">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="border-4 border-black -mt-1 first:mt-0 bg-cream hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                <div className="p-5 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center border-4 border-black ${
                      ticket.status === "open"
                        ? "bg-primary text-white"
                        : ticket.status === "coach_responded"
                        ? "bg-primary text-black"
                        : "bg-neutral-200 text-neutral-500"
                    }`}>
                      {getStatusIcon(ticket.status)}
                    </div>
                    <div>
                      <p className="font-black text-lg tracking-tight">
                        {ticket.subject.toUpperCase()}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {ticket.category && (
                          <>
                            <span className="font-mono text-xs text-neutral-500">
                              {t(`categories.${ticket.category.replace("_", "") as any}`).toUpperCase()}
                            </span>
                            <span className="text-neutral-300">•</span>
                          </>
                        )}
                        <span className="font-mono text-xs text-neutral-500">
                          {formatDate(ticket.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center border-4 px-3 py-1 font-black text-xs uppercase ${getStatusStyle(ticket.status)}`}>
                    {t(`status.${ticket.status === "coach_responded" ? "coachResponded" : ticket.status}`).toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
