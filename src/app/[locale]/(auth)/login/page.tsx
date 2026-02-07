"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, ArrowRight, Zap } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for error query parameter (e.g., from middleware redirect)
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
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      // Check if user is a coach (coaches should use admin login instead)
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_coach")
        .single<{ is_coach: boolean }>();

      if (profile?.is_coach) {
        // Coach account detected - sign them out immediately
        await supabase.auth.signOut();
        setError(t("coachAccountError"));
        return;
      }

      router.replace("/");
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border-4 border-black bg-[#FFFEF5] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      {/* Header */}
      <div className="border-b-4 border-black bg-black p-6 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center bg-[#00FF94] mb-4">
          <span className="text-2xl font-black text-black">FF</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#FFFEF5' }}>
          {t("signIn").toUpperCase()}
        </h1>
        <p className="font-mono text-xs tracking-[0.2em] mt-2" style={{ color: '#00FF94' }}>
          {t("signInDescription").toUpperCase()}
        </p>
      </div>

      {/* Form */}
      <div className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="border-4 border-[#FF3B00] bg-[#FF3B00]/10 p-4">
              <p className="font-bold text-sm uppercase" style={{ color: '#FF3B00' }}>{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block font-bold text-sm uppercase tracking-wide mb-2">
              {t("email")}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none border-r-4 border-black w-12">
                <Mail className="h-5 w-5" />
              </div>
              <input
                id="email"
                type="email"
                placeholder="YOU@EXAMPLE.COM"
                className="w-full h-14 pl-16 pr-4 border-4 border-black bg-[#FFFEF5] font-mono text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:ring-0 focus:border-black focus:bg-white transition-colors"
                {...register("email")}
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="mt-2 font-mono text-xs uppercase" style={{ color: '#FF3B00' }}>{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block font-bold text-sm uppercase tracking-wide">
                {t("password")}
              </label>
              <Link
                href="/magic-link"
                className="font-mono text-xs hover:underline uppercase"
                style={{ color: '#FF3B00' }}
              >
                {t("forgotPassword")}
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none border-r-4 border-black w-12">
                <Lock className="h-5 w-5" />
              </div>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="w-full h-14 pl-16 pr-4 border-4 border-black bg-[#FFFEF5] font-mono text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-0 focus:border-black focus:bg-white transition-colors"
                {...register("password")}
                disabled={isLoading}
              />
            </div>
            {errors.password && (
              <p className="mt-2 font-mono text-xs uppercase" style={{ color: '#FF3B00' }}>{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-14 bg-black hover:bg-[#FF3B00] text-white font-black text-lg uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <span className="animate-pulse">{t("signingIn").toUpperCase()}...</span>
            ) : (
              <>
                {t("signIn").toUpperCase()}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-4 border-black" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#FFFEF5] px-4 font-bold text-sm uppercase">
              {t("or")}
            </span>
          </div>
        </div>

        {/* Magic Link Button */}
        <Link href="/magic-link" className="block">
          <button
            className="w-full h-14 border-4 border-black bg-[#FFFEF5] hover:bg-black text-black hover:text-[#00FF94] font-black text-lg uppercase tracking-wide transition-colors flex items-center justify-center gap-3"
          >
            <Zap className="h-5 w-5" />
            {t("magicLink").toUpperCase()}
          </button>
        </Link>
      </div>

      {/* Footer */}
      <div className="border-t-4 border-black bg-neutral-100 p-4 text-center">
        <p className="font-mono text-xs tracking-[0.15em] text-neutral-500">
          SECURE LOGIN • 256-BIT ENCRYPTION
        </p>
      </div>
    </div>
  );
}
