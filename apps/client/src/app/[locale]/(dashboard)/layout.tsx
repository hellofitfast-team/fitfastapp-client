import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { DashboardShell } from "@/components/layouts";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const token = await convexAuthNextjsToken();

  if (!token) {
    redirect(`/${locale}/login`);
  }

  // Fetch profile and assessment in parallel
  const [profile, assessment] = await Promise.all([
    fetchQuery(api.profiles.getMyProfile, {}, { token }),
    fetchQuery(api.assessments.getMyAssessment, {}, { token }),
  ]);

  if (!profile) {
    redirect(`/${locale}/login`);
  }

  // Block coach accounts from accessing the client app
  if (profile.isCoach) {
    redirect(`/${locale}/login?error=coach_not_allowed`);
  }

  const hasAssessment = !!assessment;

  // Route based on profile status
  switch (profile.status) {
    case "pending_approval":
      redirect(`/${locale}/pending`);
      break;
    case "inactive":
    case "expired":
      redirect(
        `/${locale}/login?message=${encodeURIComponent(
          profile.status === "expired"
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
    <DashboardShell userName={profile.fullName || "User"}>
      {children}
    </DashboardShell>
  );
}
