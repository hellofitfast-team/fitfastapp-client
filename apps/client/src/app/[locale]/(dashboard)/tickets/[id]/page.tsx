"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@fitfast/i18n/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  MessageSquare,
  Shield,
  Send,
  Loader2,
} from "lucide-react";
import { Skeleton } from "@fitfast/ui/skeleton";
import { cn } from "@fitfast/ui/cn";

interface TicketMessage {
  sender: string;
  message: string;
  timestamp: number;
}

// Group messages by calendar day
function groupMessagesByDate(messages: TicketMessage[], locale: string, t: (key: string) => string) {
  const groups: { dateKey: string; label: string; messages: TicketMessage[] }[] = [];
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  for (const msg of messages) {
    const dateKey = new Date(msg.timestamp).toISOString().split("T")[0];
    const existing = groups.find((g) => g.dateKey === dateKey);
    if (existing) {
      existing.messages.push(msg);
    } else {
      let label: string;
      if (dateKey === today) {
        label = t("chat.today");
      } else if (dateKey === yesterday) {
        label = t("chat.yesterday");
      } else {
        label = new Date(dateKey).toLocaleDateString(
          locale === "ar" ? "ar-u-nu-latn" : "en-US",
          { month: "short", day: "numeric" }
        );
      }
      groups.push({ dateKey, label, messages: [msg] });
    }
  }
  return groups;
}

function formatTime(timestamp: number, locale: string): string {
  return new Date(timestamp).toLocaleTimeString(
    locale === "ar" ? "ar-u-nu-latn" : "en-US",
    { hour: "2-digit", minute: "2-digit" }
  );
}

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const t = useTranslations("tickets");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const ticket = useQuery(api.tickets.getTicketById, {
    ticketId: ticketId as Id<"tickets">,
  });
  const replyToTicket = useMutation(api.tickets.replyToTicket);

  const isLoading = ticket === undefined;

  const [reply, setReply] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on mount and new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages?.length]);

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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "open": return "bg-success-500/10 text-success-500";
      case "coach_responded": return "bg-[#F59E0B]/10 text-[#F59E0B]";
      case "closed": return "bg-neutral-100 text-muted-foreground";
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

  const messageGroups = groupMessagesByDate(
    ticket.messages as TicketMessage[],
    locale,
    (key: string) => safeT(key, key)
  );

  return (
    <div className="px-4 py-6 space-y-4 max-w-3xl mx-auto lg:px-6 flex flex-col min-h-[calc(100vh-8rem)]">
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

      {/* Chat conversation */}
      <div className="flex-1 space-y-1">
        {messageGroups.map((group) => (
          <div key={group.dateKey}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium px-2 py-1 bg-neutral-100 rounded-full">
                {group.label}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Messages */}
            {group.messages.map((msg, i) => {
              const isCoach = msg.sender === "coach";

              if (isCoach) {
                // Coach message (left/gray)
                return (
                  <div
                    key={`${group.dateKey}-${i}`}
                    className="flex items-end gap-2 justify-start mb-2 animate-slide-up"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-200 mb-1">
                      <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className={cn(
                      "max-w-[75%] rounded-2xl bg-neutral-100 text-foreground px-4 py-2.5 shadow-sm",
                      isRtl ? "rounded-br-sm" : "rounded-bl-sm"
                    )}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{formatTime(msg.timestamp, locale)}</p>
                    </div>
                  </div>
                );
              }

              // Client message (right/blue)
              return (
                <div
                  key={`${group.dateKey}-${i}`}
                  className="flex items-end gap-2 justify-end mb-2 animate-slide-up"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className={cn(
                    "max-w-[75%] rounded-2xl bg-primary text-primary-foreground px-4 py-2.5 shadow-sm",
                    isRtl ? "rounded-bl-sm" : "rounded-br-sm"
                  )}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                    <p className="text-[10px] text-primary-foreground/70 mt-1">{formatTime(msg.timestamp, locale)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply area */}
      {ticket.status !== "closed" ? (
        <div className="sticky bottom-0 bg-background border-t border-border p-3 -mx-4 lg:-mx-6 px-4 lg:px-6 flex gap-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={t("replyPlaceholder")}
            rows={1}
            className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
            disabled={isSending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendReply();
              }
            }}
          />
          <button
            onClick={handleSendReply}
            disabled={isSending || !reply.trim()}
            className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-[0.97] disabled:opacity-50 transition-all"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      ) : (
        <div className="rounded-lg bg-neutral-50 border border-border p-3 text-center">
          <p className="text-sm text-muted-foreground">{t("ticketClosed")}</p>
        </div>
      )}
    </div>
  );
}
