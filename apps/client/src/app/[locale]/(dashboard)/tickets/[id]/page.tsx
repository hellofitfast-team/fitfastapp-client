"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@fitfast/i18n/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft, MessageSquare, Shield, Send, Loader2 } from "lucide-react";
import { Skeleton } from "@fitfast/ui/skeleton";
import { cn } from "@fitfast/ui/cn";
import { formatTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TicketMessage {
  sender: string;
  message: string;
  timestamp: number;
}

// Group messages by calendar day
function groupMessagesByDate(
  messages: TicketMessage[],
  locale: string,
  t: (key: string) => string,
) {
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
        label = new Date(dateKey).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
          month: "short",
          day: "numeric",
        });
      }
      groups.push({ dateKey, label, messages: [msg] });
    }
  }
  return groups;
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
  const { toast } = useToast();

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
      toast({ title: t("errors.replyFailed"), variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const toCamelCase = (str: string) => str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

  const safeT = (key: string, fallback: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic key from server data
      return t(key as any);
    } catch {
      return fallback;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "open":
        return "bg-success-500/10 text-success-500";
      case "coach_responded":
        return "bg-warning-500/10 text-warning-500";
      case "closed":
        return "bg-neutral-100 text-muted-foreground";
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 lg:px-6">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 lg:px-6">
        <Link
          href="/tickets"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t("backToTickets")}
        </Link>
        <div className="border-border bg-card rounded-xl border p-10 text-center">
          <MessageSquare className="text-muted-foreground/40 mx-auto mb-3 h-10 w-10" />
          <p className="font-medium">{t("ticketNotFound")}</p>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(
    ticket.messages as TicketMessage[],
    locale,
    (key: string) => safeT(key, key),
  );

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl flex-col space-y-4 px-4 py-6 lg:px-6">
      {/* Back button */}
      <Link
        href="/tickets"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t("backToTickets")}
      </Link>

      {/* Ticket header */}
      <div className="border-border bg-card shadow-card rounded-xl border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">{ticket.subject}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {ticket.category && (
                <span className="text-muted-foreground text-xs">
                  {safeT(`categories.${toCamelCase(ticket.category)}`, ticket.category)}
                </span>
              )}
            </div>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              getStatusStyle(ticket.status),
            )}
          >
            {safeT(
              `status.${ticket.status === "coach_responded" ? "coachResponded" : ticket.status}`,
              ticket.status,
            )}
          </span>
        </div>
      </div>

      {/* Chat conversation */}
      <div className="flex-1 space-y-1">
        {messageGroups.map((group) => (
          <div key={group.dateKey}>
            {/* Date separator */}
            <div className="my-4 flex items-center gap-3">
              <div className="bg-border h-px flex-1" />
              <span className="text-muted-foreground rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium">
                {group.label}
              </span>
              <div className="bg-border h-px flex-1" />
            </div>

            {/* Messages */}
            {group.messages.map((msg, i) => {
              const isCoach = msg.sender === "coach";

              if (isCoach) {
                // Coach message (left/gray)
                return (
                  <div
                    key={`${group.dateKey}-${i}`}
                    className="animate-slide-up mb-2 flex items-end justify-start gap-2"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-200">
                      <Shield className="text-muted-foreground h-3.5 w-3.5" />
                    </div>
                    <div
                      className={cn(
                        "text-foreground max-w-[75%] rounded-2xl bg-neutral-100 px-4 py-2.5 shadow-sm",
                        isRtl ? "rounded-br-sm" : "rounded-bl-sm",
                      )}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      <p className="text-muted-foreground mt-1 text-[10px]">
                        {formatTime(new Date(msg.timestamp), locale)}
                      </p>
                    </div>
                  </div>
                );
              }

              // Client message (right/blue)
              return (
                <div
                  key={`${group.dateKey}-${i}`}
                  className="animate-slide-up mb-2 flex items-end justify-end gap-2"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div
                    className={cn(
                      "bg-primary text-primary-foreground max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm",
                      isRtl ? "rounded-bl-sm" : "rounded-br-sm",
                    )}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                    <p className="text-primary-foreground/70 mt-1 text-[10px]">
                      {formatTime(new Date(msg.timestamp), locale)}
                    </p>
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
        <div className="bg-background border-border sticky bottom-0 -mx-4 flex gap-2 border-t p-3 px-4 lg:-mx-6 lg:px-6">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={t("replyPlaceholder")}
            rows={1}
            className="border-border bg-card placeholder:text-muted-foreground focus:ring-ring flex-1 resize-none rounded-xl border px-3 py-2 text-sm transition-colors focus:ring-2 focus:outline-none"
            disabled={isSending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendReply();
              }
            }}
          />
          <button
            type="button"
            onClick={handleSendReply}
            disabled={isSending || !reply.trim()}
            aria-label={t("sendReply")}
            className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all active:scale-[0.97] disabled:opacity-50"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      ) : (
        <div className="border-border rounded-lg border bg-neutral-50 p-3 text-center">
          <p className="text-muted-foreground text-sm">{t("ticketClosed")}</p>
        </div>
      )}
    </div>
  );
}
