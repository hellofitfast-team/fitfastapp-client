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
    case "expired":
      redirect(`/${locale}/expired`);
      break;
    case "inactive":
      redirect(
        `/${locale}/login?message=${encodeURIComponent(
          "Your account is inactive. Please contact support."
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

  // Compute days until plan expiry for the near-expiry banner
  let daysUntilExpiry: number | null = null;
  if (profile.planEndDate) {
    const endDate = new Date(profile.planEndDate + "T23:59:59");
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 3) {
      daysUntilExpiry = diffDays;
    }
  }

  return (
    <DashboardShell
      userName={profile.fullName || "User"}
      daysUntilExpiry={daysUntilExpiry}
    >
      {children}
    </DashboardShell>
  );
}
