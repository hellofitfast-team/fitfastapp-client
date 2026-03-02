"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "@fitfast/i18n/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Mail, Lock, ArrowRight, Zap, Loader2 } from "lucide-react";

type LoginFormData = {
  email: string;
  password: string;
};

const ALLOWED_MESSAGES = new Set(["session_expired", "account_pending", "password_changed"]);

export default function LoginPage() {
  const t = useTranslations("auth");
  const locale = useLocale();

  const loginSchema = z.object({
    email: z.string().email(t("validEmail")),
    password: z.string().min(6, t("passwordMinLength")),
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signOut } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const profile = useQuery(api.profiles.getMyProfile, isAuthenticated ? {} : "skip");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tracks whether we're actively signing out a stale session to prevent redirect loops
  const isSigningOut = useRef(false);

  // If user is already signed in, check role then redirect
  useEffect(() => {
    if (!isAuthenticated || profile === undefined || isSigningOut.current) return;

    if (profile?.isCoach) {
      // Coach session on client app (shared cookie collision) — auto-clear it
      isSigningOut.current = true;
      signOut().then(() => {
        isSigningOut.current = false;
        setError(t("coachAccountError"));
        // Hard reload to clear any stale server-side auth state and stop the
        // server-redirect → client-signout loop that causes a blank page.
        window.location.replace(`/${locale}/login`);
      });
      return;
    }

    // Regular client — proceed to dashboard
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, profile, router, signOut, t, locale]);

  // Auto-clear stale coach session when redirected with coach_not_allowed
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (
      (errorParam === "coach_account" || errorParam === "coach_not_allowed") &&
      isAuthenticated &&
      !isSigningOut.current
    ) {
      // Stale coach session still in cookie — sign out to clear it
      isSigningOut.current = true;
      signOut().then(() => {
        isSigningOut.current = false;
        // Hard reload to break server-redirect ↔ client-signout loop
        window.location.replace(`/${locale}/login`);
      });
      return;
    }

    const messageParam = searchParams.get("message");
    if (errorParam === "coach_account" || errorParam === "coach_not_allowed") {
      setError(t("coachAccountError"));
    } else if (messageParam && ALLOWED_MESSAGES.has(messageParam)) {
      setError(t(`loginMessages.${messageParam}`));
    }
  }, [searchParams, t, isAuthenticated, signOut, locale]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("email", data.email);
      formData.set("password", data.password);
      formData.set("flow", "signIn");

      await signIn("password", formData);
      router.replace("/");
    } catch {
      // Never expose raw server errors — always show friendly message
      setError(t("invalidCredentials"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border-border bg-card animate-fade-in overflow-hidden rounded-2xl border shadow-sm">
      {/* Header */}
      <div className="border-border border-b p-6 text-center">
        <h1 className="text-2xl font-bold">{t("signIn")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("signInDescription")}</p>
      </div>

      {/* Form */}
      <div className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="bg-error-500/10 border-error-500/20 rounded-lg border p-3">
              <p className="text-error-500 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              {t("email")}
            </label>
            <div className="relative">
              <Mail className="text-muted-foreground absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="border-input bg-card placeholder:text-muted-foreground focus:ring-ring h-11 w-full rounded-lg border ps-10 pe-4 text-sm transition-colors focus:ring-2 focus:outline-none"
                {...register("email")}
                disabled={isLoading}
              />
            </div>
            {errors.email && <p className="text-error-500 mt-1 text-xs">{errors.email.message}</p>}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium">
                {t("password")}
              </label>
              <Link href="/magic-link" className="text-primary text-xs hover:underline">
                {t("forgotPassword")}
              </Link>
            </div>
            <div className="relative">
              <Lock className="text-muted-foreground absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="border-input bg-card placeholder:text-muted-foreground focus:ring-ring h-11 w-full rounded-lg border ps-10 pe-4 text-sm transition-colors focus:ring-2 focus:outline-none"
                {...register("password")}
                disabled={isLoading}
              />
            </div>
            {errors.password && (
              <p className="text-error-500 mt-1 text-xs">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("signingIn")}...
              </>
            ) : (
              <>
                {t("signIn")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="border-border w-full border-t" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-card text-muted-foreground px-3 text-xs">{t("or")}</span>
          </div>
        </div>

        {/* Magic Link / Forgot Password */}
        <Link href="/magic-link" className="block">
          <button className="border-border flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors hover:bg-neutral-50">
            <Zap className="h-4 w-4" />
            {t("magicLink")}
          </button>
        </Link>
      </div>
    </div>
  );
}
