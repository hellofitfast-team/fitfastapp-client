"use client";

import { useState } from "react";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { SaveButton } from "./save-button";

const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourpage" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourpage" },
  { key: "twitter", label: "Twitter / X", placeholder: "https://x.com/yourpage" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourchannel" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourpage" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/yourprofile" },
] as const;

type SocialLinks = Record<string, string>;

export function SocialLinksManager() {
  const t = useTranslations("settings");
  const { isAuthenticated } = useConvexAuth();
  const serverLinks = useQuery(api.systemConfig.getSocialLinks, isAuthenticated ? {} : "skip");
  const updateSocialLinks = useMutation(api.systemConfig.updateSocialLinks);

  const [links, setLinks] = useState<SocialLinks | null>(null);

  // Initialize local state once server data arrives (setState during render is safe if conditional)
  if (serverLinks !== undefined && links === null) {
    setLinks(serverLinks);
  }

  if (links === null) {
    return <div className="h-32 animate-pulse rounded-xl border border-stone-200 bg-stone-50" />;
  }

  const handleChange = (key: string, value: string) => {
    setLinks({ ...links, [key]: value });
  };

  const handleSave = async () => {
    try {
      await updateSocialLinks({ links: links as Parameters<typeof updateSocialLinks>[0]["links"] });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { feature: "admin-settings", operation: "update-social-links" },
      });
      throw error;
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="mb-1 block text-xs font-medium text-stone-500">{label}</label>
            <input
              type="url"
              value={links[key] ?? ""}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={placeholder}
              dir="ltr"
              className="focus:ring-primary/20 focus:border-primary h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 transition-all placeholder:text-stone-400 focus:ring-2 focus:outline-none"
            />
          </div>
        ))}
        <p className="text-[11px] text-stone-400">{t("socialLinksDesc")}</p>
      </div>

      <div className="flex justify-end pt-2">
        <SaveButton onSave={handleSave} label={t("saveSocialLinks")} />
      </div>
    </div>
  );
}
