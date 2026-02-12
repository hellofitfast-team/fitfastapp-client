"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, ArrowRight, Dumbbell } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const t = useTranslations("admin");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for error query parameter (e.g., from middleware redirect)
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "coach_account") {
      setError(t("coachAccountRedirect"));
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

      // Sign in with password
      const { data: authData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

      if (signInError) {
        setError(t("invalidCredentials"));
        return;
      }

      // Verify the user is a coach
      const { data: profile, error: queryError } = await supabase
        .from("profiles")
        .select()
        .eq("id", authData.user.id)
        .single<{ is_coach: boolean }>();

      if (queryError || !profile?.is_coach) {
        // Sign out non-coach users immediately
        await supabase.auth.signOut();
        setError(t("notAuthorized"));
        return;
      }

      // Coach verified → go to admin dashboard
      router.replace("/admin");
    } catch {
      setError(t("invalidCredentials"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-stone-50 p-4"
      style={{ fontFamily: "var(--font-outfit)" }}
    >
      {/* Subtle background pattern - decorative admin branding */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #92400e 1px, transparent 0)", backgroundSize: "32px 32px" }} />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-200/50">
          {/* Header */}
          <div className="px-8 pt-10 pb-2 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-amber-600 mb-5 shadow-lg shadow-amber-600/20">
              <Dumbbell className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              {t("signIn")}
            </h1>
            <p className="text-sm text-stone-500 mt-1.5">
              {t("signInDescription")}
            </p>
          </div>

          {/* Form */}
          <div className="px-8 pt-6 pb-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-medium text-red-600">{error}</p>
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-stone-700 mb-1.5"
                >
                  {t("email")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Mail className="h-4 w-4 text-stone-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    placeholder="coach@fitfast.app"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                    {...register("email")}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-stone-700 mb-1.5"
                >
                  {t("password")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Lock className="h-4 w-4 text-stone-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                    {...register("password")}
                    disabled={isLoading}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-xl bg-amber-600 text-white font-semibold text-sm hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20"
              >
                {isLoading ? (
                  <span className="animate-pulse">{t("signingIn")}...</span>
                ) : (
                  <>
                    {t("signIn")}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-stone-400 mt-6">
          Coach Panel &middot; Authorized Access Only
        </p>
      </div>
    </div>
  );
}
