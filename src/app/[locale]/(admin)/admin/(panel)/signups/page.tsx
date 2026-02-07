import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { SignupsTable } from "./signups-table";

export default async function AdminSignupsPage() {
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const { data: signups } = await supabase
    .from("pending_signups")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          {t("signups")}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {t("pendingSignups")}
        </p>
      </div>

      <SignupsTable signups={signups ?? []} />
    </div>
  );
}
