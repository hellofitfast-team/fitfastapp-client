"use client";

import { useState } from "react";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface CreateTicketData {
  subject: string;
  category: "meal_issue" | "workout_issue" | "technical" | "bug_report" | "other";
  description?: string;
  screenshotId?: Id<"_storage">;
  deviceInfo?: Record<string, unknown>;
  pageUrl?: string;
}

export function useTickets() {
  const { isAuthenticated } = useConvexAuth();
  const tickets = useQuery(
    api.tickets.getMyTickets,
    isAuthenticated ? {} : "skip",
  );
  const createTicketMutation = useMutation(api.tickets.createTicket);

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const createTicket = async (ticketData: CreateTicketData) => {
    setIsCreating(true);
    setCreateError(null);

    try {
      const ticketId = await createTicketMutation(ticketData);
      setIsCreating(false);
      return ticketId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create ticket";
      setCreateError(errorMessage);
      setIsCreating(false);
      return null;
    }
  };

  return {
    tickets: tickets ?? [],
    isLoading: isAuthenticated && tickets === undefined,
    error: null,
    createTicket,
    isCreating,
    createError,
  };
}
