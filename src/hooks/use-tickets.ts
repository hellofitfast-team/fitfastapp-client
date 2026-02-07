"use client";

import useSWR from "swr";
import { useState } from "react";
import type { Ticket } from "@/types/database";

interface TicketsResponse {
  tickets: Ticket[];
}

interface CreateTicketData {
  subject: string;
  category: "meal_issue" | "workout_issue" | "technical" | "bug_report" | "other";
  description?: string;
  screenshot_url?: string;
}

const fetcher = async (url: string): Promise<TicketsResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch tickets");
  }
  return response.json();
};

export function useTickets() {
  const { data, error, isLoading, mutate } = useSWR<TicketsResponse>(
    "/api/tickets",
    fetcher
  );

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const createTicket = async (ticketData: CreateTicketData): Promise<Ticket | null> => {
    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ticketData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create ticket");
      }

      const result = await response.json();

      // Revalidate the tickets list
      await mutate();

      setIsCreating(false);
      return result.ticket;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create ticket";
      setCreateError(errorMessage);
      setIsCreating(false);
      return null;
    }
  };

  return {
    tickets: data?.tickets || [],
    isLoading,
    error: error?.message || null,
    createTicket,
    isCreating,
    createError,
    refetch: mutate,
  };
}
