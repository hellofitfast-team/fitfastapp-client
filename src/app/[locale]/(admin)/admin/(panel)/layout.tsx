import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { Toaster } from "@/components/ui/toaster";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Fetch coach profile + badge counts in parallel
  const [profileResult, signupsResult, ticketsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single<{ full_name: string | null }>(),
    supabase
      .from("pending_signups")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
  ]);

  return (
    <>
      <AdminShell
        coachName={profileResult.data?.full_name ?? "Coach"}
        pendingSignups={signupsResult.count ?? 0}
        openTickets={ticketsResult.count ?? 0}
      >
        {children}
      </AdminShell>
      <Toaster />
    </>
  );
}
