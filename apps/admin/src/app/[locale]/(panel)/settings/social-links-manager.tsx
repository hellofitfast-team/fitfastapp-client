"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (serverLinks !== undefined && links === null) {
      setLinks(serverLinks);
    }
  }, [serverLinks, links]);

  if (links === null) {
    return (
      <div className="h-32 rounded-xl border border-stone-200 bg-stone-50 animate-pulse" />
    );
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
      <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
        {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-stone-500 mb-1">
              {label}
            </label>
            <input
              type="url"
              value={links[key] ?? ""}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={placeholder}
              dir="ltr"
              className="w-full h-10 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        ))}
        <p className="text-[11px] text-stone-400">
          {t("socialLinksHint")}
        </p>
      </div>

      <div className="flex justify-end pt-2">
        <SaveButton onSave={handleSave} label={t("saveSocialLinks")} />
      </div>
    </div>
  );
}
