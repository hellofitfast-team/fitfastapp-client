import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile } from "@/types/database";
import { AppError } from "@/lib/errors";
import * as Sentry from "@sentry/nextjs";

export async function getProfileById(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single<Profile>();

  if (error || !data) {
    Sentry.captureException(error || new Error("Profile not found"), {
      tags: { feature: "profile-query" },
      extra: { userId, errorCode: error?.code },
    });
    throw new AppError("Profile not found", "PROFILE_NOT_FOUND", { userId });
  }

  return data;
}
