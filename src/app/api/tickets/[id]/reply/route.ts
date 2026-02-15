import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

// POST /api/tickets/[id]/reply - Client replies to their ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the ticket belongs to this user (uses user's RLS — SELECT allowed)
    const { data: ticket, error: fetchError } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single<{ id: string; status: string; description: string }>();

    if (fetchError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.status === "closed") {
      return NextResponse.json(
        { error: "Ticket is closed" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Use admin client for the update (no UPDATE RLS policy for regular users)
    const admin = createAdminClient();

    const separator = "\n\n---\n\n";
    const timestamp = new Date().toISOString();
    const updatedDescription = `${ticket.description || ""}${separator}**Client Reply (${timestamp}):**\n${message}`;

    const { data: updated, error: updateError } = await admin
      .from("tickets")
      .update({
        description: updatedDescription,
        status: "open",
      } as never)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      Sentry.captureException(updateError, {
        tags: { feature: "tickets" },
        extra: { userId: user.id, ticketId: id, action: "reply" },
      });
      return NextResponse.json(
        { error: "Failed to send reply" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ticket: updated });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "tickets" },
      extra: { action: "ticket-reply" },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
