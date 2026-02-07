import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { TicketsList } from "./tickets-list";

export default async function AdminTicketsPage() {
  const t = await getTranslations("admin");
  const supabase = await createClient();

  // Fetch tickets with client names
  const { data: tickets } = await supabase
    .from("tickets")
    .select("*,profiles:user_id(full_name)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          {t("openTickets")}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {(tickets?.length ?? 0)} total tickets
        </p>
      </div>

      <TicketsList tickets={tickets ?? []} />
    </div>
  );
}
