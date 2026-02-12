import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, CheckIn } from "@/types/database";
import * as Sentry from "@sentry/nextjs";

export async function getCheckInById(
  supabase: SupabaseClient<Database>,
  checkInId: string
): Promise<CheckIn | null> {
  const { data, error } = await supabase
    .from("check_ins")
    .select("*")
    .eq("id", checkInId)
    .single<CheckIn>();

  if (error) {
    // Log to Sentry but return null since check-in is optional (non-critical)
    Sentry.captureException(error, {
      tags: { feature: "check-in-query" },
      extra: { checkInId, errorCode: error?.code },
    });
    return null;
  }

  return data;
}
