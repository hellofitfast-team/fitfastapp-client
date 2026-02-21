"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  MessageSquare,
  Send,
  CheckCircle,
  Clock,
  MessageCircle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

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

const categoryLabels: Record<string, string> = {
  meal_issue: "Meal",
  workout_issue: "Workout",
  technical: "Technical",
  bug_report: "Bug",
  other: "Other",
};

export function TicketsList() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const tickets = useQuery(api.tickets.getAllTickets);
  const respondToTicket = useMutation(api.tickets.respondToTicket);
  const closeTicket = useMutation(api.tickets.closeTicket);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [respondingId, setRespondingId] = useState<string | null>(null);

  if (tickets === undefined) return null;

  const handleRespond = async (ticketId: Id<"tickets">) => {
    if (!response.trim()) return;
    setRespondingId(ticketId);

    try {
      await respondToTicket({ ticketId, message: response });
      setResponse("");
      setExpandedId(null);
    } catch (err) {
      console.error("Failed to respond:", err);
    }
    setRespondingId(null);
  };

  const handleClose = async (ticketId: Id<"tickets">) => {
    try {
      await closeTicket({ ticketId });
    } catch (err) {
      console.error("Failed to close:", err);
    }
  };

  if (tickets.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
        <MessageSquare className="h-12 w-12 mx-auto text-stone-300 mb-4" />
        <p className="font-medium text-stone-500">
          {t("noResults")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => {
        const StatusIcon = statusIcons[ticket.status] ?? Clock;
        const isExpanded = expandedId === ticket._id;

        // Get the latest message info
        const lastClientMessage = ticket.messages.find((m) => m.sender === "client");
        const lastCoachMessage = [...ticket.messages].reverse().find((m) => m.sender === "coach");

        return (
          <div
            key={ticket._id}
            className="rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-colors"
          >
            {/* Header row */}
            <button
              onClick={() =>
                setExpandedId(isExpanded ? null : ticket._id)
              }
              className="w-full flex items-center gap-4 p-4 text-start"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                  statusStyles[ticket.status] ?? ""
                }`}
              >
                <StatusIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate text-stone-900">
                    {ticket.subject}
                  </p>
                  {ticket.category && (
                    <span className="shrink-0 rounded-full border border-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-500">
                      {categoryLabels[ticket.category] ?? ticket.category}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
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
              <div className="border-t border-stone-100 p-4 space-y-4">
                {/* Messages thread */}
                {ticket.messages.map((msg, i) => (
                  <div
                    key={i}
                    className={
                      msg.sender === "coach"
                        ? "border-s-2 border-primary/30 ps-4 bg-primary/5 rounded-e-lg py-2 pe-3"
                        : ""
                    }
                  >
                    <p className="text-xs font-medium text-stone-400 mb-1">
                      {msg.sender === "coach" ? "Coach Response" : "Client"}
                    </p>
                    <p className="text-sm text-stone-700">{msg.message}</p>
                  </div>
                ))}

                {(ticket.status as string) !== "closed" && (
                  <div className="space-y-2">
                    <textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder="Type your response..."
                      rows={3}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespond(ticket._id)}
                        disabled={
                          respondingId === ticket._id ||
                          !response.trim()
                        }
                        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        <Send className="h-3 w-3" />
                        {t("respond")}
                      </button>
                      {(ticket.status as string) !== "closed" && (
                        <button
                          onClick={() => handleClose(ticket._id)}
                          className="flex items-center gap-2 rounded-lg border border-stone-200 px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Close
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
