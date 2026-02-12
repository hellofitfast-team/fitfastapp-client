import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOneSignalClient } from "@/lib/onesignal";
import { validateRequestBody } from "@/lib/api-validation";
import { SendNotificationSchema } from "@/lib/api-validation/admin";
import * as Sentry from "@sentry/nextjs";

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

  const body = await request.json();
  const validation = validateRequestBody(body, SendNotificationSchema, {
    userId: user.id,
    feature: "send-notification",
  });
  if (!validation.success) return validation.response;
  const { title, message, user_ids, send_to_all } = validation.data;

  try {
    const onesignal = getOneSignalClient();

    if (send_to_all) {
      const result = await onesignal.sendToAll(title, message);
      return NextResponse.json(result);
    }

    const result = await onesignal.sendToUsers(user_ids!, title, message);
    return NextResponse.json(result);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "send-notification" },
      extra: { coachId: user.id, send_to_all },
    });
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
