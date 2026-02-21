"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "@fitfast/i18n/navigation";
import { useSignIn, useAuth } from "@clerk/nextjs";
import { Mail, Lock, ArrowRight, Zap, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { isSignedIn, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If user is already signed in, redirect to home
  useEffect(() => {
    if (isSignedIn) {
      router.replace("/");
    }
  }, [isSignedIn, router]);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "coach_account") {
      setError(t("coachAccountError"));
    }
  }, [searchParams, t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    if (!isLoaded || !signIn) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn.create({
        identifier: data.email,
        password: data.password,
      });

      console.log("Sign-in result:", JSON.stringify({ status: result.status, sessionId: result.createdSessionId, firstFactors: result.supportedFirstFactors?.map(f => f.strategy) }));

      if (result.status === "complete") {
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
        }
        router.replace("/");
        return;
      }

      if (result.status === "needs_first_factor") {
        const attemptResult = await signIn.attemptFirstFactor({
          strategy: "password",
          password: data.password,
        });

        console.log("First factor result:", attemptResult.status);

        if (attemptResult.status === "complete") {
          if (attemptResult.createdSessionId) {
            await setActive({ session: attemptResult.createdSessionId });
          }
          router.replace("/");
          return;
        }
      }

      if (result.status === "needs_second_factor") {
        setError("Two-factor authentication is enabled. Please disable MFA in Clerk Dashboard → Configure → Multi-factor.");
      } else {
        setError(`Sign in incomplete (status: ${result.status}). Please try again.`);
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ code?: string; message?: string }> };
      const errorCode = clerkError.errors?.[0]?.code;

      // If there's a stale session, sign out and retry
      if (errorCode === "session_exists") {
        await signOut();
        try {
          const retryResult = await signIn.create({
            identifier: data.email,
            password: data.password,
          });
          if (retryResult.status === "complete" && retryResult.createdSessionId) {
            await setActive({ session: retryResult.createdSessionId });
            router.replace("/");
            return;
          }
        } catch {
          // Fall through to generic error
        }
      }

      setError(
        clerkError.errors?.[0]?.message || "Invalid email or password",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 text-center border-b border-border">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-3">
          <span className="text-xl font-bold text-primary">FF</span>
        </div>
        <h1 className="text-2xl font-bold">{t("signIn")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("signInDescription")}</p>
      </div>

      {/* Form */}
      <div className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error-500/10 border border-error-500/20 p-3">
              <p className="text-sm text-error-500">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5">
              {t("email")}
            </label>
            <div className="relative">
              <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="w-full h-11 ps-10 pe-4 rounded-lg border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                {...register("email")}
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-error-500">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium">
                {t("password")}
              </label>
              <Link href="/magic-link" className="text-xs text-primary hover:underline">
                {t("forgotPassword")}
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="w-full h-11 ps-10 pe-4 rounded-lg border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                {...register("password")}
                disabled={isLoading}
              />
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-error-500">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.97] flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{t("signingIn")}...</>
            ) : (
              <>{t("signIn")}<ArrowRight className="h-4 w-4 rtl:rotate-180" /></>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-card px-3 text-xs text-muted-foreground">{t("or")}</span>
          </div>
        </div>

        {/* Magic Link / Forgot Password */}
        <Link href="/magic-link" className="block">
          <button className="w-full py-3 rounded-lg border border-border text-sm font-medium hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2">
            <Zap className="h-4 w-4" />
            {t("magicLink")}
          </button>
        </Link>
      </div>
    </div>
  );
}
