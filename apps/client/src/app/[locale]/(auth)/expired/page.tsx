"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "@fitfast/i18n/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { AlertTriangle, LogOut } from "lucide-react";
import { Button } from "@fitfast/ui/button";
import { RenewalCheckout } from "@/components/renewal/renewal-checkout";

export default function ExpiredPage() {
  const t = useTranslations("subscription.expired");
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  const profile = useQuery(
    api.profiles.getMyProfile,
    isAuthenticated ? {} : "skip"
  );

  // Auto-redirect if account is reactivated (Convex reactive subscription)
  useEffect(() => {
    if (profile && profile.status === "active") {
      router.replace("/");
    }
  }, [profile, router]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="space-y-6">
      {/* Expired Warning Card */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900 dark:bg-amber-950/30">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
          <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-xl font-bold mb-1">{t("title")}</h2>
        <p className="text-sm text-muted-foreground mb-3">{t("subtitle")}</p>
        <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 rounded-lg px-3 py-2 inline-block">
          {t("dataWarning")}
        </p>
      </div>

      {/* Renewal Checkout */}
      <RenewalCheckout />

      {/* Logout */}
      <div className="text-center pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-muted-foreground"
        >
          <LogOut className="h-4 w-4 me-2" />
          {t("logoutButton")}
        </Button>
      </div>
    </div>
  );
}
