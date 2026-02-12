"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const setPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SetPasswordFormData = z.infer<typeof setPasswordSchema>;

export default function SetPasswordPage() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordSet, setPasswordSet] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordSchema),
  });

  const password = watch("password");

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setIsValidSession(false);
        setError("Invalid or expired session. Please request a new magic link.");
      } else {
        setIsValidSession(true);
      }
    };

    checkSession();
  }, []);

  const onSubmit = async (data: SetPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setPasswordSet(true);

      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 2000);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isValidSession === null) {
    return (
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="p-12 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-black border-t-primary animate-spin mb-4" />
          <p className="font-bold text-sm uppercase tracking-wide">{tCommon("loading").toUpperCase()}</p>
        </div>
      </div>
    );
  }

  // Session expired error
  if (isValidSession === false) {
    return (
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-error-500 p-6 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center bg-white mb-4">
            <AlertCircle className="h-8 w-8 text-error-500" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            SESSION EXPIRED
          </h1>
          <p className="font-mono text-xs tracking-[0.2em] text-white/80 mt-2">
            {error?.toUpperCase()}
          </p>
        </div>
        <div className="p-6">
          <button
            onClick={() => router.push("/magic-link")}
            className="w-full h-14 bg-black text-cream font-black text-lg uppercase tracking-wide hover:bg-primary transition-colors"
          >
            REQUEST NEW MAGIC LINK
          </button>
        </div>
      </div>
    );
  }

  // Password set success
  if (passwordSet) {
    return (
      <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-4 border-black bg-success-500 p-6 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center bg-black mb-4">
            <CheckCircle2 className="h-8 w-8 text-success-500" />
          </div>
          <h1 className="text-3xl font-black text-black tracking-tight">
            {t("passwordSet").toUpperCase()}
          </h1>
          <p className="font-mono text-xs tracking-[0.2em] text-black/70 mt-2">
            {t("redirectingToDashboard").toUpperCase()}
          </p>
        </div>
        <div className="p-6 flex justify-center">
          <div className="w-8 h-8 border-4 border-black border-t-success-500 animate-spin" />
        </div>
      </div>
    );
  }

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return { level: 0, text: "WEAK" };
    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const score = [hasLength, hasUpper, hasLower, hasNumber].filter(Boolean).length;
    if (score === 4) return { level: 3, text: "STRONG" };
    if (score >= 2) return { level: 2, text: "MEDIUM" };
    return { level: 1, text: "WEAK" };
  };

  const strength = getPasswordStrength();

  return (
    <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      {/* Header */}
      <div className="border-b-4 border-black bg-black p-6 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center bg-primary mb-4">
          <Lock className="h-8 w-8 text-black" />
        </div>
        <h1 className="text-3xl font-black text-cream tracking-tight">
          {t("setPassword").toUpperCase()}
        </h1>
        <p className="font-mono text-xs tracking-[0.2em] text-primary mt-2">
          {t("createPasswordDescription").toUpperCase()}
        </p>
      </div>

      {/* Form */}
      <div className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="border-4 border-error-500 bg-error-500/10 p-4">
              <p className="font-bold text-error-500 text-sm uppercase">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block font-bold text-sm uppercase tracking-wide mb-2">
              {t("password")}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none border-r-4 border-black w-12">
                <Lock className="h-5 w-5" />
              </div>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full h-14 pl-16 pr-4 border-4 border-black bg-cream font-mono text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-0 focus:border-black focus:bg-white transition-colors"
                {...register("password")}
                disabled={isLoading}
              />
            </div>
            <p className="mt-2 font-mono text-xs text-neutral-500 uppercase">
              {t("passwordRequirements")}
            </p>
            {errors.password && (
              <p className="mt-2 font-mono text-xs text-error-500 uppercase">{errors.password.message}</p>
            )}

            {/* Password strength indicator */}
            {password && password.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex gap-1">
                  <div className={`h-2 flex-1 border-2 border-black ${strength.level >= 1 ? "bg-error-500" : "bg-neutral-200"}`} />
                  <div className={`h-2 flex-1 border-2 border-black ${strength.level >= 2 ? "bg-orange-400" : "bg-neutral-200"}`} />
                  <div className={`h-2 flex-1 border-2 border-black ${strength.level >= 3 ? "bg-success-500" : "bg-neutral-200"}`} />
                </div>
                <p className="font-mono text-xs uppercase">
                  STRENGTH: <span className={strength.level === 3 ? "text-success-500" : strength.level === 2 ? "text-orange-500" : "text-error-500"}>{strength.text}</span>
                </p>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block font-bold text-sm uppercase tracking-wide mb-2">
              {t("confirmPassword")}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none border-r-4 border-black w-12">
                <Lock className="h-5 w-5" />
              </div>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full h-14 pl-16 pr-4 border-4 border-black bg-cream font-mono text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-0 focus:border-black focus:bg-white transition-colors"
                {...register("confirmPassword")}
                disabled={isLoading}
              />
            </div>
            {errors.confirmPassword && (
              <p className="mt-2 font-mono text-xs text-error-500 uppercase">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-14 bg-black text-cream font-black text-lg uppercase tracking-wide hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <span className="animate-pulse">{t("updatingPassword").toUpperCase()}...</span>
            ) : (
              <>
                {t("setPassword").toUpperCase()}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="border-t-4 border-black bg-neutral-100 p-4 text-center">
        <p className="font-mono text-xs tracking-[0.15em] text-neutral-500">
          SECURE • 256-BIT ENCRYPTION
        </p>
      </div>
    </div>
  );
}
