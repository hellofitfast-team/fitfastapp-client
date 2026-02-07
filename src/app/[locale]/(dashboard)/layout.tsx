import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layouts";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const locale = await getLocale();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Run profile + assessment checks in parallel (not sequential like before)
  const [profileResult, assessmentResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("status,full_name")
      .eq("id", user.id)
      .single(),
    supabase
      .from("initial_assessments")
      .select("id")
      .eq("user_id", user.id)
      .single(),
  ]);

  const profile = profileResult.data;

  if (!profile) {
    redirect(`/${locale}/login`);
  }

  const hasAssessment = !!assessmentResult.data;
  const { status, full_name } = profile;

  // Route based on profile status
  switch (status) {
    case "pending_approval":
      redirect(`/${locale}/pending`);
      break;
    case "inactive":
    case "expired":
      redirect(
        `/${locale}/login?message=${encodeURIComponent(
          status === "expired"
            ? "Your subscription has expired. Please contact support."
            : "Your account is inactive. Please contact support."
        )}`
      );
      break;
    case "active":
      if (!hasAssessment) {
        redirect(`/${locale}/initial-assessment`);
      }
      break;
    default:
      redirect(`/${locale}/login`);
  }

  return (
    <DashboardShell userName={full_name || "User"}>
      {children}
    </DashboardShell>
  );
}
