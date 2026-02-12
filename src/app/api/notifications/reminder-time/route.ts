import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateRequestBody } from "@/lib/api-validation";
import { ReminderTimeSchema } from "@/lib/api-validation";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("notification_reminder_time")
    .eq("id", user.id)
    .single<{ notification_reminder_time: string | null }>();

  if (error) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Postgres TIME comes back as "HH:MM:SS", trim to "HH:MM"
  const raw = data.notification_reminder_time ?? "08:00:00";
  const reminderTime = raw.slice(0, 5);

  return NextResponse.json({ reminder_time: reminderTime });
}

export async function PUT(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const validation = validateRequestBody(body, ReminderTimeSchema, {
    userId: user.id,
    feature: "reminder-time",
  });
  if (!validation.success) return validation.response;
  const { reminder_time } = validation.data;

  const { error } = await supabase
    .from("profiles")
    .update({ notification_reminder_time: reminder_time } as never)
    .eq("id", user.id);

  if (error) {
    Sentry.captureException(error, {
      tags: { feature: "reminder-time" },
      extra: { userId: user.id, action: "update-reminder" },
    });
    return NextResponse.json(
      { error: "Failed to update reminder time" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, reminder_time });
}
