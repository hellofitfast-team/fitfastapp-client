import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, InitialAssessment } from "@/types/database";
import { AppError } from "@/lib/errors";
import * as Sentry from "@sentry/nextjs";

export async function getAssessmentByUserId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<InitialAssessment> {
  const { data, error } = await supabase
    .from("initial_assessments")
    .select("*")
    .eq("user_id", userId)
    .single<InitialAssessment>();

  if (error || !data) {
    Sentry.captureException(error || new Error("Assessment not found"), {
      tags: { feature: "assessment-query" },
      extra: { userId, errorCode: error?.code },
    });
    throw new AppError("Assessment not found", "ASSESSMENT_NOT_FOUND", {
      userId,
    });
  }

  return data;
}
