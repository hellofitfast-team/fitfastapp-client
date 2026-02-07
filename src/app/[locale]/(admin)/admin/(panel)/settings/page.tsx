import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import type { SystemConfig } from "@/types/database";
import { AdminSettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const { data: configs } = await supabase
    .from("system_config")
    .select()
    .returns<SystemConfig[]>();

  const configMap: Record<string, unknown> = {};
  configs?.forEach((c) => {
    configMap[c.key] = c.value;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          {t("settingsPage")}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          System configuration
        </p>
      </div>

      <AdminSettingsForm config={configMap} />
    </div>
  );
}
