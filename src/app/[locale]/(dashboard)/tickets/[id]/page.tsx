"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { Ticket } from "@/types/database";
import { cn, formatDate } from "@/lib/utils";

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const t = useTranslations("tickets");
  const locale = useLocale();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function fetchTicket() {
      try {
        const res = await fetch(`/api/tickets/${ticketId}`);
        if (!res.ok) {
          setError(res.status === 404 ? "notFound" : "fetchError");
          return;
        }
        const data = await res.json();
        setTicket(data.ticket);
      } catch {
        setError("fetchError");
      } finally {
        setIsLoading(false);
      }
    }
    fetchTicket();
  }, [ticketId]);

  const handleSendReply = async () => {
    if (!reply.trim() || !ticket) return;
    setIsSending(true);

    try {
      const res = await fetch(`/api/tickets/${ticket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setTicket(data.ticket);
        setReply("");
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setIsSending(false);
    }
  };

  const toCamelCase = (str: string) =>
    str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

  const safeT = (key: string, fallback: string) => {
    try {
      return t(key as any);
    } catch {
      return fallback;
    }
  };

  const formatDateWithTime = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      const d = date.toLocaleDateString(locale === "ar" ? "ar-u-nu-latn" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const t = date.toLocaleTimeString(locale === "ar" ? "ar-u-nu-latn" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${d} ${t}`;
    } catch {
      return "";
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "open":
        return "border-primary bg-primary text-white";
      case "coach_responded":
        return "border-primary bg-primary text-white";
      case "closed":
        return "border-success-500 bg-success-500 text-white";
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="space-y-6">
        <Link
          href="/tickets"
          className="inline-flex items-center gap-2 font-bold text-sm uppercase hover:text-primary transition-colors h-12"
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          {t("backToTickets")}
        </Link>
        <div className="border-4 border-black bg-cream p-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-neutral-300 mb-4" />
          <p className="font-black text-lg">
            {error === "notFound" ? t("ticketNotFound") : t("fetchError")}
          </p>
        </div>
      </div>
    );
  }

  // Parse conversation: original description + any appended replies
  const descriptionParts = (ticket.description || "").split("\n\n---\n\n");
  const originalMessage = descriptionParts[0];
  const followUpMessages = descriptionParts.slice(1);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/tickets"
        className="inline-flex items-center gap-2 font-bold text-sm uppercase hover:text-primary transition-colors h-12"
      >
        <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        {t("backToTickets")}
      </Link>

      {/* Ticket header */}
      <div className="border-4 border-black bg-black p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-cream">
              {ticket.subject.toUpperCase()}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {ticket.category && (
                <span className="font-mono text-xs text-primary">
                  {safeT(`categories.${toCamelCase(ticket.category)}`, ticket.category).toUpperCase()}
                </span>
              )}
              <span className="font-mono text-xs text-neutral-400">
                {formatDateWithTime(ticket.created_at)}
              </span>
            </div>
          </div>
          <span
            className={`shrink-0 inline-flex items-center border-4 px-3 py-1 font-black text-xs uppercase ${getStatusStyle(ticket.status)}`}
          >
            {safeT(`status.${ticket.status === "coach_responded" ? "coachResponded" : ticket.status}`, ticket.status).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Conversation thread */}
      <div className="space-y-4">
        {/* Original client message */}
        {originalMessage && (
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary border-4 border-black">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 border-4 border-black bg-cream p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-black text-sm uppercase">{t("you")}</span>
                <span className="font-mono text-xs text-neutral-400">
                  {formatDateWithTime(ticket.created_at)}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{originalMessage}</p>
              {ticket.screenshot_url && (
                <a
                  href={ticket.screenshot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-primary font-bold text-xs uppercase hover:underline"
                >
                  <ImageIcon className="h-4 w-4" />
                  {t("viewScreenshot")}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Coach response */}
        {ticket.coach_response && (
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-black border-4 border-black">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 border-4 border-black bg-primary/10 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-black text-sm uppercase">{t("coach")}</span>
                <span className="font-mono text-xs text-neutral-400">
                  {ticket.updated_at !== ticket.created_at
                    ? formatDateWithTime(ticket.updated_at)
                    : ""}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{ticket.coach_response}</p>
            </div>
          </div>
        )}

        {/* Follow-up messages (appended replies) */}
        {followUpMessages.map((msg, i) => {
          const isCoach = msg.startsWith("**Coach");
          return (
            <div key={i} className="flex gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center border-4 border-black",
                  isCoach ? "bg-black" : "bg-primary"
                )}
              >
                {isCoach ? (
                  <Shield className="h-5 w-5 text-primary" />
                ) : (
                  <User className="h-5 w-5 text-white" />
                )}
              </div>
              <div
                className={cn(
                  "flex-1 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  isCoach ? "bg-primary/10" : "bg-cream"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{msg}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply input — only if ticket is not closed */}
      {ticket.status !== "closed" ? (
        <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="border-b-4 border-black bg-primary p-3 flex items-center gap-2">
            <Send className="h-4 w-4 text-black" />
            <span className="font-black text-sm text-black uppercase">
              {t("replyToTicket")}
            </span>
          </div>
          <div className="p-4 space-y-3">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={t("replyPlaceholder").toUpperCase()}
              rows={3}
              className="w-full p-3 border-4 border-black bg-cream font-mono text-sm placeholder:text-neutral-400 focus:outline-none focus:bg-white transition-colors resize-none"
              disabled={isSending}
            />
            <button
              onClick={handleSendReply}
              disabled={isSending || !reply.trim()}
              className="w-full h-12 bg-black hover:bg-primary text-cream font-black text-sm uppercase tracking-wide transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("sending")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {t("sendReply")}
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="border-4 border-black bg-neutral-100 p-4 text-center">
          <p className="font-black text-sm text-neutral-500 uppercase">
            {t("ticketClosed")}
          </p>
        </div>
      )}
    </div>
  );
}
