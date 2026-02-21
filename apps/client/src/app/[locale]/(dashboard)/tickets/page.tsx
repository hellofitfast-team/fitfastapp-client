"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { MessageSquarePlus, Clock, CheckCircle2, MessageSquare, ChevronRight, Upload, Send, Loader2 } from "lucide-react";
import { useTickets } from "@/hooks/use-tickets";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { EmptyState } from "@fitfast/ui/empty-state";
import { Skeleton } from "@fitfast/ui/skeleton";
import { Link } from "@fitfast/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@fitfast/ui/cn";
import { formatDate } from "@/lib/utils";

const ticketSchema = z.object({
  subject: z.string().min(3, "Subject must be at least 3 characters").max(100, "Subject must be under 100 characters"),
  category: z.enum(["meal_issue", "workout_issue", "technical", "bug_report", "other"]),
  description: z.string().optional(),
});
type TicketFormData = z.infer<typeof ticketSchema>;

export default function TicketsPage() {
  const t = useTranslations("tickets");
  const tEmpty = useTranslations("emptyStates");
  const locale = useLocale();
  const { tickets, isLoading, error, createTicket } = useTickets();
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: { subject: "", category: "meal_issue", description: "" },
  });

  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadScreenshot = async (): Promise<Id<"_storage"> | undefined> => {
    if (!screenshotFile) return undefined;
    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": screenshotFile.type },
        body: screenshotFile,
      });
      const { storageId } = await result.json();
      return storageId as Id<"_storage">;
    } catch {
      return undefined;
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: TicketFormData) => {
    const screenshotId = await uploadScreenshot();
    const result = await createTicket({
      subject: data.subject.trim(),
      category: data.category,
      description: data.description?.trim() || undefined,
      screenshotId,
    });
    if (result) {
      reset();
      setScreenshotFile(null);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <Clock className="h-4 w-4" />;
      case "coach_responded": return <MessageSquare className="h-4 w-4" />;
      case "closed": return <CheckCircle2 className="h-4 w-4" />;
      default: return null;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "open": return "bg-primary/10 text-primary";
      case "coach_responded": return "bg-primary/10 text-primary";
      case "closed": return "bg-success-500/10 text-success-500";
      default: return "";
    }
  };

  return (
    <div className="px-4 py-6 space-y-6 max-w-3xl mx-auto lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("myTickets")}</p>
      </div>

      {/* Success Message */}
      {submitSuccess && (
        <div className="rounded-lg bg-success-500/10 border border-success-500/20 p-3 text-center animate-slide-up">
          <p className="text-sm font-medium text-success-500">
            {locale === "ar" ? "تم إرسال التذكرة بنجاح!" : "Ticket submitted successfully!"}
          </p>
        </div>
      )}

      {/* New Ticket Form */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-border bg-primary/5">
          <MessageSquarePlus className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">{t("newTicket")}</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">{t("subject")}</label>
            <input
              type="text"
              {...register("subject")}
              placeholder={t("subjectPlaceholder")}
              className={cn(
                "w-full h-11 px-3.5 rounded-lg border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors",
                errors.subject ? "border-error-500" : "border-input"
              )}
              aria-invalid={errors.subject ? "true" : "false"}
              disabled={isSubmitting}
            />
            {errors.subject && (
              <p className="mt-1 text-xs text-error-500" role="alert">{errors.subject.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t("category")}</label>
            <select
              {...register("category")}
              className="w-full h-11 px-3.5 rounded-lg border border-input bg-card text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              disabled={isSubmitting}
            >
              <option value="meal_issue">{t("categories.mealIssue")}</option>
              <option value="workout_issue">{t("categories.workoutIssue")}</option>
              <option value="technical">{t("categories.technical")}</option>
              <option value="bug_report">{t("categories.bugReport")}</option>
              <option value="other">{t("categories.other")}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t("description")}</label>
            <textarea
              {...register("description")}
              placeholder={t("descriptionPlaceholder")}
              className="w-full min-h-[100px] p-3.5 rounded-lg border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              {t("screenshot")} <span className="text-muted-foreground font-normal">({locale === "ar" ? "اختياري" : "optional"})</span>
            </label>
            <label className="flex items-center justify-center h-16 rounded-lg border border-dashed border-border bg-neutral-50 cursor-pointer hover:bg-neutral-100 transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && file.size <= 5 * 1024 * 1024) setScreenshotFile(file);
                }}
                disabled={isSubmitting || isUploading}
              />
              <div className="flex items-center gap-2 text-muted-foreground">
                <Upload className="h-4 w-4" />
                <span className="text-xs">{screenshotFile ? screenshotFile.name : t("uploadHint")}</span>
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="w-full py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{locale === "ar" ? "جارٍ الإرسال..." : "Submitting..."}</>
            ) : (
              <><Send className="h-4 w-4" />{t("submitTicket")}</>
            )}
          </button>
        </form>
      </div>

      {/* Existing Tickets */}
      <div>
        <h2 className="font-semibold text-sm text-muted-foreground mb-3">{t("myTickets")}</h2>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-error-500">{error}</p>
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title={tEmpty("noTickets.title")}
            description={tEmpty("noTickets.description")}
            action={{
              label: tEmpty("noTickets.action"),
              onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }),
            }}
          />
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <Link
                key={ticket._id}
                href={`/tickets/${ticket._id}`}
                className="block rounded-xl border border-border bg-card p-4 hover:bg-neutral-50 transition-colors active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      ticket.status === "open" ? "bg-primary/10 text-primary"
                        : ticket.status === "coach_responded" ? "bg-primary/10 text-primary"
                        : "bg-neutral-100 text-muted-foreground"
                    )}>
                      {getStatusIcon(ticket.status)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{ticket.subject}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {ticket.category && (
                          <>
                            <span className="text-xs text-muted-foreground">
                              {t(`categories.${ticket.category.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()) as any}`)}
                            </span>
                            <span className="text-neutral-300">•</span>
                          </>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(new Date(ticket._creationTime).toISOString(), locale)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      getStatusStyle(ticket.status)
                    )}>
                      {t(`status.${ticket.status === "coach_responded" ? "coachResponded" : ticket.status}`)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
