"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSignUp, useAuth } from "@clerk/nextjs";
import { Link } from "@fitfast/i18n/navigation";
import { Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";

export default function AcceptInvitePage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp, setActive, isLoaded } = useSignUp();
  const { isSignedIn } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get("__clerk_ticket");

  // If already signed in, redirect to pending
  useEffect(() => {
    if (isSignedIn) {
      router.replace("/pending");
    }
  }, [isSignedIn, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    setError(null);

    if (password !== confirmPassword) {
      setError(t("passwordsMustMatch"));
      return;
    }

    if (password.length < 8) {
      setError(t("invalidPassword"));
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp.create({
        strategy: "ticket",
        ticket: token!,
        password,
      });

      if (result.status === "complete") {
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
        }
        // isSignedIn effect will redirect to /pending
      } else {
        setError(t("inviteExpired"));
      }
    } catch (err: unknown) {
      const clerkError = err as {
        errors?: Array<{ code?: string; message?: string }>;
      };
      const code = clerkError.errors?.[0]?.code;

      if (code === "invitation_not_found" || code === "invitation_expired") {
        setError(t("inviteExpired"));
      } else {
        setError(
          clerkError.errors?.[0]?.message ?? t("inviteExpired"),
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Invalid link — no token present
  if (!token) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
        <div className="p-6 text-center border-b border-border">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-3">
            <span className="text-xl font-bold text-primary">FF</span>
          </div>
          <h1 className="text-2xl font-bold">{t("invalidInviteLink")}</h1>
        </div>
        <div className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4 rounded-lg bg-error-500/10 border border-error-500/20 p-4">
            <AlertCircle className="h-5 w-5 text-error-500 shrink-0" />
            <p className="text-sm text-error-500">
              {t("invalidInviteLink")}
            </p>
          </div>
          <Link
            href="/login"
            className="text-sm text-primary hover:underline"
          >
            {t("signIn")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 text-center border-b border-border">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-3">
          <span className="text-xl font-bold text-primary">FF</span>
        </div>
        <h1 className="text-2xl font-bold">{t("acceptInvite")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("setPassword")}
        </p>
      </div>

      {/* Form */}
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-error-500/10 border border-error-500/20 p-3">
              <AlertCircle className="h-4 w-4 text-error-500 shrink-0 mt-0.5" />
              <p className="text-sm text-error-500">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5">
              {t("setPassword")}
            </label>
            <div className="relative">
              <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 ps-10 pe-4 rounded-lg border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                disabled={isLoading}
                required
                minLength={8}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("passwordRequirements")}
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium mb-1.5"
            >
              {t("confirmPassword")}
            </label>
            <div className="relative">
              <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-11 ps-10 pe-4 rounded-lg border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Required by Clerk for bot protection */}
          <div id="clerk-captcha" />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.97] flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("updatingPassword")}
              </>
            ) : (
              <>
                {t("createAccount")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            {t("signIn")}&nbsp;
            <Link href="/login" className="text-primary hover:underline">
              {t("login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
