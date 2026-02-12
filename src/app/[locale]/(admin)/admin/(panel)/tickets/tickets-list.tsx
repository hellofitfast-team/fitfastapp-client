"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  MessageSquare,
  Send,
  CheckCircle,
  Clock,
  MessageCircle,
} from "lucide-react";

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  category: string | null;
  description: string | null;
  status: string;
  coach_response: string | null;
  screenshot_url: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
}

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

export function TicketsList({ tickets }: { tickets: Ticket[] }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const handleRespond = async (ticketId: string) => {
    if (!response.trim()) return;
    setRespondingId(ticketId);

    const supabase = createClient();
    await supabase
      .from("tickets")
      .update({
        coach_response: response,
        status: "coach_responded" as const,
      } as never)
      .eq("id", ticketId);

    setResponse("");
    setExpandedId(null);
    setRespondingId(null);
    startTransition(() => router.refresh());
  };

  const handleClose = async (ticketId: string) => {
    const supabase = createClient();
    await supabase
      .from("tickets")
      .update({ status: "closed" as const } as never)
      .eq("id", ticketId);

    startTransition(() => router.refresh());
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
        const isExpanded = expandedId === ticket.id;

        return (
          <div
            key={ticket.id}
            className="rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-colors"
          >
            {/* Header row */}
            <button
              onClick={() =>
                setExpandedId(isExpanded ? null : ticket.id)
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
                  {ticket.profiles?.full_name ?? "Unknown"} &middot;{" "}
                  {new Date(ticket.created_at).toLocaleDateString()}
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
                {ticket.description && (
                  <div>
                    <p className="text-xs font-medium text-stone-400 mb-1">
                      Description
                    </p>
                    <p className="text-sm text-stone-700">{ticket.description}</p>
                  </div>
                )}

                {ticket.coach_response && (
                  <div className="border-s-2 border-primary/30 ps-4 bg-primary/5 rounded-e-lg py-2 pe-3">
                    <p className="text-xs font-medium text-primary mb-1">
                      Coach Response
                    </p>
                    <p className="text-sm text-stone-700">{ticket.coach_response}</p>
                  </div>
                )}

                {ticket.status !== "closed" && (
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
                        onClick={() => handleRespond(ticket.id)}
                        disabled={
                          isPending ||
                          respondingId === ticket.id ||
                          !response.trim()
                        }
                        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        <Send className="h-3 w-3" />
                        {t("respond")}
                      </button>
                      {ticket.status !== "closed" && (
                        <button
                          onClick={() => handleClose(ticket.id)}
                          disabled={isPending}
                          className="flex items-center gap-2 rounded-lg border border-stone-200 px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50"
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
