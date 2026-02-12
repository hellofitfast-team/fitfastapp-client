import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { InsertTables } from "@/types/database";
import { validateRequestBody, CreateTicketSchema } from "@/lib/api-validation";
import * as Sentry from "@sentry/nextjs";

// GET /api/tickets - Fetch all tickets for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch tickets for this user
    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (ticketsError) {
      Sentry.captureException(ticketsError, {
        tags: { feature: "tickets" },
        extra: { userId: user.id, action: "fetch-tickets" },
      });
      return NextResponse.json(
        { error: "Failed to fetch tickets" },
        { status: 500 }
      );
    }

    return NextResponse.json({ tickets: tickets || [] });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "tickets" },
      extra: { action: "fetch-tickets" },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/tickets - Create a new ticket
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const validation = validateRequestBody(body, CreateTicketSchema, {
      userId: user.id,
      feature: "ticket-creation",
    });
    if (!validation.success) return validation.response;
    const { subject, category, description, screenshot_url } = validation.data;

    // Create the ticket
    const ticketData: InsertTables<"tickets"> = {
      user_id: user.id,
      subject,
      category,
      description: description || null,
      screenshot_url: screenshot_url || null,
      status: "open",
    };

    const { data: ticket, error: insertError } = await supabase
      .from("tickets")
      .insert(ticketData as any)
      .select()
      .single();

    if (insertError) {
      Sentry.captureException(insertError, {
        tags: { feature: "tickets" },
        extra: { userId: user.id, action: "create-ticket" },
      });
      return NextResponse.json(
        { error: "Failed to create ticket" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "tickets" },
      extra: { action: "create-ticket" },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
