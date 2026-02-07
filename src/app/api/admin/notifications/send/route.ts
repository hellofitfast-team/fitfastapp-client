import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOneSignalClient } from "@/lib/onesignal";

export async function POST(request: Request) {
  const supabase = await createClient();

  // Verify caller is a coach
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_coach")
    .eq("id", user.id)
    .single<{ is_coach: boolean }>();

  if (!profile?.is_coach) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, message, user_ids, send_to_all } = await request.json();

  if (!title || !message) {
    return NextResponse.json(
      { error: "title and message are required" },
      { status: 400 }
    );
  }

  try {
    const onesignal = getOneSignalClient();

    if (send_to_all) {
      const result = await onesignal.sendToAll(title, message);
      return NextResponse.json(result);
    }

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json(
        { error: "user_ids array is required when send_to_all is false" },
        { status: 400 }
      );
    }

    const result = await onesignal.sendToUsers(user_ids, title, message);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error sending notification:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
