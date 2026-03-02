"use client";

import { useTranslations } from "next-intl";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bell } from "lucide-react";
import { Switch } from "@fitfast/ui/switch";
import { toast } from "@/hooks/use-toast";

export function NotificationToggle() {
  const tSettings = useTranslations("settings");
  const { isAuthenticated } = useConvexAuth();
  const setConfig = useMutation(api.systemConfig.setConfig);

  const config = useQuery(
    api.systemConfig.getConfig,
    isAuthenticated ? { key: "notifications_enabled" } : "skip",
  );

  // Default to enabled if no config exists yet
  const isEnabled = config === undefined ? undefined : config?.value !== false;

  const handleToggle = async (checked: boolean) => {
    try {
      await setConfig({ key: "notifications_enabled", value: checked });
    } catch {
      toast({
        title: tSettings("pushNotifications"),
        description: checked
          ? "Failed to enable notifications."
          : "Failed to disable notifications.",
        variant: "destructive",
      });
    }
  };

  if (isEnabled === undefined) return null;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-900">
              {tSettings("pushNotifications")}
            </h2>
            <p className="mt-0.5 text-xs text-stone-400">{tSettings("pushNotificationsDesc")}</p>
          </div>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
          aria-label={tSettings("pushNotifications")}
        />
      </div>
    </div>
  );
}
