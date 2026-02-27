"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MessageSquare, Send, CheckCircle, Clock, MessageCircle, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const statusIcons: Record<string, typeof Clock> = {
  open: Clock,
  coach_responded: MessageCircle,
  closed: CheckCircle,
};

const statusStyles: Record<string, string> = {
  open: "text-primary bg-primary/10 border-primary/20",
  coach_responded: "text-emerald-600 bg-emerald-50 border-emerald-200",
  closed: "text-stone-500 bg-stone-100 border-stone-200",
};

export function TicketsList() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const { isAuthenticated } = useConvexAuth();
  const tickets = useQuery(api.tickets.getAllTickets, isAuthenticated ? {} : "skip");
  const respondToTicket = useMutation(api.tickets.respondToTicket);
  const closeTicket = useMutation(api.tickets.closeTicket);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const toggleTicket = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setResponse("");
  };

  if (tickets === undefined) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const handleRespond = async (ticketId: Id<"tickets">) => {
    if (!response.trim()) return;
    setRespondingId(ticketId);

    try {
      await respondToTicket({ ticketId, message: response });
      setResponse("");
      setExpandedId(null);
    } catch (err) {
      console.error("Failed to respond:", err); // Sentry captures this
      toast({ title: t("respondFailed"), variant: "destructive" });
    }
    setRespondingId(null);
  };

  const handleClose = async (ticketId: Id<"tickets">) => {
    try {
      await closeTicket({ ticketId });
    } catch (err) {
      console.error("Failed to close:", err); // Sentry captures this
      toast({ title: t("closeFailed"), variant: "destructive" });
    }
  };

  if (tickets.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
        <MessageSquare className="mx-auto mb-4 h-12 w-12 text-stone-300" />
        <p className="font-medium text-stone-500">{t("noResults")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => {
        const StatusIcon = statusIcons[ticket.status] ?? Clock;
        const isExpanded = expandedId === ticket._id;

        return (
          <div
            key={ticket._id}
            className="rounded-xl border border-stone-200 bg-white transition-colors hover:border-stone-300"
          >
            {/* Header row */}
            <button
              onClick={() => toggleTicket(ticket._id)}
              className="flex w-full items-center gap-4 p-4 text-start"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  statusStyles[ticket.status] ?? ""
                }`}
              >
                <StatusIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-stone-900">{ticket.subject}</p>
                  {ticket.category && (
                    <span className="shrink-0 rounded-full border border-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-500">
                      {t(`categoryLabels.${ticket.category}`, { defaultValue: ticket.category })}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-stone-400">
                  {formatDate(new Date(ticket._creationTime).toISOString(), locale)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                  statusStyles[ticket.status] ?? ""
                }`}
              >
                {ticket.status.replace("_", " ")}
              </span>
            </button>

            {/* Expanded details */}
            {isExpanded && (
              <div className="space-y-4 border-t border-stone-100 p-4">
                {/* Messages thread */}
                {ticket.messages.map((msg, i) => (
                  <div
                    key={i}
                    className={
                      msg.sender === "coach"
                        ? "border-primary/30 bg-primary/5 rounded-e-lg border-s-2 py-2 ps-4 pe-3"
                        : ""
                    }
                  >
                    <p className="mb-1 text-xs font-medium text-stone-400">
                      {msg.sender === "coach" ? t("coachResponse") : t("client")}
                    </p>
                    <p className="text-sm text-stone-700">{msg.message}</p>
                  </div>
                ))}

                {(ticket.status as string) !== "closed" && (
                  <div className="space-y-2">
                    <textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder={t("typeResponse")}
                      rows={3}
                      className="focus:ring-primary/20 focus:border-primary w-full resize-none rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-900 transition-all placeholder:text-stone-400 focus:ring-2 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespond(ticket._id)}
                        disabled={respondingId === ticket._id || !response.trim()}
                        className="bg-primary hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium text-white transition-colors disabled:opacity-50"
                      >
                        <Send className="h-3 w-3" />
                        {t("respond")}
                      </button>
                      {(ticket.status as string) !== "closed" && (
                        <button
                          onClick={() => handleClose(ticket._id)}
                          className="flex items-center gap-2 rounded-lg border border-stone-200 px-4 py-2 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
                        >
                          <CheckCircle className="h-3 w-3" />
                          {t("close")}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
