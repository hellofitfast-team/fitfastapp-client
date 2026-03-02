import { redirect } from "next/navigation";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { AdminShell } from "@/components/admin-shell";
import { Toaster } from "@fitfast/ui/toaster";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const token = await convexAuthNextjsToken();

  if (!token) {
    redirect("/login");
  }

  // Fetch profile, pending signups count, and open tickets count in parallel
  const [profile, pendingSignups, openTickets] = await Promise.all([
    fetchQuery(api.profiles.getMyProfile, {}, { token }).catch(() => null),
    fetchQuery(api.pendingSignups.getPendingSignups, {}, { token }).catch(() => []),
    fetchQuery(api.tickets.getAllTickets, {}, { token }).catch(() => []),
  ]);

  if (!profile?.isCoach) {
    redirect("/login");
  }

  return (
    <>
      <AdminShell
        coachName={profile.fullName ?? "Coach"}
        pendingSignups={pendingSignups.length}
        openTickets={openTickets.filter((t) => t.status === "open").length}
      >
        {children}
      </AdminShell>
      <Toaster />
    </>
  );
}
