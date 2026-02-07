import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { reminder_time } = await request.json();

  // Validate HH:MM format
  if (!reminder_time || !/^\d{2}:\d{2}$/.test(reminder_time)) {
    return NextResponse.json(
      { error: "Invalid time format. Use HH:MM" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ notification_reminder_time: reminder_time } as never)
    .eq("id", user.id);

  if (error) {
    console.error("Error updating reminder time:", error);
    return NextResponse.json(
      { error: "Failed to update reminder time" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, reminder_time });
}
