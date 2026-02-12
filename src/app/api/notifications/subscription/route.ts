import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateRequestBody } from "@/lib/api-validation";
import { SubscriptionSchema, UnsubscribeSchema } from "@/lib/api-validation";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const validation = validateRequestBody(body, SubscriptionSchema, {
    userId: user.id,
    feature: "push-subscription",
  });
  if (!validation.success) return validation.response;
  const { onesignal_subscription_id, device_type } = validation.data;

  // Upsert: check if subscription already exists
  const { data: existing } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("onesignal_subscription_id", onesignal_subscription_id)
    .single<{ id: string }>();

  if (existing) {
    // Reactivate existing subscription
    await supabase
      .from("push_subscriptions")
      .update({ is_active: true, device_type } as never)
      .eq("id", existing.id);

    return NextResponse.json({ success: true, id: existing.id });
  }

  // Create new subscription
  const { data, error } = await supabase
    .from("push_subscriptions")
    .insert({
      user_id: user.id,
      onesignal_subscription_id,
      device_type: device_type || "web",
    } as never)
    .select("id")
    .single<{ id: string }>();

  if (error) {
    Sentry.captureException(error, {
      tags: { feature: "push-subscription" },
      extra: { userId: user.id, action: "save-subscription" },
    });
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, id: data.id });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const validation = validateRequestBody(body, UnsubscribeSchema, {
    userId: user.id,
    feature: "push-unsubscribe",
  });
  if (!validation.success) return validation.response;
  const { onesignal_subscription_id } = validation.data;

  // Soft-deactivate
  await supabase
    .from("push_subscriptions")
    .update({ is_active: false } as never)
    .eq("onesignal_subscription_id", onesignal_subscription_id)
    .eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
