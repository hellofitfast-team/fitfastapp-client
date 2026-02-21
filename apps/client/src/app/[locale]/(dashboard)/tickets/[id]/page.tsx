"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@fitfast/i18n/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  MessageSquare,
  User,
  Shield,
  Send,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { Skeleton } from "@fitfast/ui/skeleton";
import { cn } from "@fitfast/ui/cn";

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const t = useTranslations("tickets");
  const locale = useLocale();

  const ticket = useQuery(api.tickets.getTicketById, {
    ticketId: ticketId as Id<"tickets">,
  });
  const replyToTicket = useMutation(api.tickets.replyToTicket);

  const isLoading = ticket === undefined;

  const [reply, setReply] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSendReply = async () => {
    if (!reply.trim() || !ticket) return;
    setIsSending(true);
    try {
      await replyToTicket({
        ticketId: ticketId as Id<"tickets">,
        message: reply.trim(),
      });
      setReply("");
    } catch {
      // silently fail -- user can retry
    } finally {
      setIsSending(false);
    }
  };

  const toCamelCase = (str: string) =>
    str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

  const safeT = (key: string, fallback: string) => {
    try { return t(key as any); } catch { return fallback; }
  };

  const formatDateWithTime = (timestamp: number | null | undefined) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "";
      const d = date.toLocaleDateString(locale === "ar" ? "ar-u-nu-latn" : "en-US", {
        year: "numeric", month: "short", day: "numeric",
      });
      const time = date.toLocaleTimeString(locale === "ar" ? "ar-u-nu-latn" : "en-US", {
        hour: "2-digit", minute: "2-digit",
      });
      return `${d} ${time}`;
    } catch { return ""; }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "open": return "bg-primary/10 text-primary";
      case "coach_responded": return "bg-primary/10 text-primary";
      case "closed": return "bg-success-500/10 text-success-500";
      default: return "";
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="px-4 py-6 space-y-6 max-w-3xl mx-auto">
        <Link
          href="/tickets"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t("backToTickets")}
        </Link>
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium">{t("ticketNotFound")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-4 max-w-3xl mx-auto lg:px-6">
      {/* Back button */}
      <Link
        href="/tickets"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t("backToTickets")}
      </Link>

      {/* Ticket header */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">{ticket.subject}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {ticket.category && (
                <span className="text-xs text-muted-foreground">
                  {safeT(`categories.${toCamelCase(ticket.category)}`, ticket.category)}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDateWithTime(ticket._creationTime)}
              </span>
            </div>
          </div>
          <span className={cn(
            "shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            getStatusStyle(ticket.status)
          )}>
            {safeT(`status.${ticket.status === "coach_responded" ? "coachResponded" : ticket.status}`, ticket.status)}
          </span>
        </div>
      </div>

      {/* Conversation thread */}
      <div className="space-y-3">
        {ticket.messages.map((msg, i) => {
          const isCoach = msg.sender === "coach";
          return (
            <div key={i} className="flex gap-2.5">
              <div className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                isCoach ? "bg-neutral-100" : "bg-primary/10"
              )}>
                {isCoach ? <Shield className="h-4 w-4 text-muted-foreground" /> : <User className="h-4 w-4 text-primary" />}
              </div>
              <div className={cn(
                "flex-1 rounded-xl rounded-ts-none border p-3.5",
                isCoach ? "bg-neutral-50 border-border" : "bg-primary/5 border-primary/10"
              )}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold">
                    {isCoach ? t("coach") : t("you")}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDateWithTime(msg.timestamp)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply input */}
      {ticket.status !== "closed" ? (
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="p-4 space-y-3">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={t("replyPlaceholder")}
              rows={3}
              className="w-full p-3 rounded-lg border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
              disabled={isSending}
            />
            <button
              onClick={handleSendReply}
              disabled={isSending || !reply.trim()}
              className="w-full py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />{t("sending")}</>
              ) : (
                <><Send className="h-4 w-4" />{t("sendReply")}</>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-neutral-50 border border-border p-3 text-center">
          <p className="text-sm text-muted-foreground">{t("ticketClosed")}</p>
        </div>
      )}
    </div>
  );
}
