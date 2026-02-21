import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { AdminShell } from "@/components/admin-shell";
import { Toaster } from "@fitfast/ui/toaster";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });

  if (!token) {
    redirect("/login");
  }

  // Fetch profile, pending signups count, and open tickets count in parallel
  const [profile, pendingSignups, openTickets] = await Promise.all([
    fetchQuery(api.profiles.getMyProfile, {}, { token }),
    fetchQuery(api.pendingSignups.getPendingSignups, {}, { token }).catch(
      () => [],
    ),
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
