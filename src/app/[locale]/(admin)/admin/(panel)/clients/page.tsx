import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { ClientsList } from "./clients-list";

export default async function AdminClientsPage() {
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("profiles")
    .select("id,full_name,phone,status,plan_tier,plan_start_date,plan_end_date,created_at")
    .eq("is_coach", false)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          {t("clients")}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {(clients?.length ?? 0)} {t("totalClients").toLowerCase()}
        </p>
      </div>

      <ClientsList clients={clients ?? []} />
    </div>
  );
}
