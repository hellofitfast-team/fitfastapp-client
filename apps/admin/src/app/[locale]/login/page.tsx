"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Mail, Lock, ArrowRight } from "lucide-react";

function createLoginSchema(t: (key: string) => string) {
  return z.object({
    email: z.string().email(t("invalidEmail")),
    password: z.string().min(6, t("passwordMinLength")),
  });
}

type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>;

export default function AdminLoginPage() {
  const t = useTranslations("admin");
  const tValidation = useTranslations("validation");
  const loginSchema = createLoginSchema((key) => tValidation(key));
  const router = useRouter();
  const searchParams = useSearchParams();
  const cardRef = useRef<HTMLDivElement>(null);
  const { signIn, signOut } = useAuthActions();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signInComplete, setSignInComplete] = useState(false);

  const { isAuthenticated: isConvexAuth } = useConvexAuth();
  const profile = useQuery(api.profiles.getMyProfile, isConvexAuth ? {} : "skip");
  const isSigningOut = useRef(false);

  // Derive error from URL param instead of setting state in an effect
  const errorParam = searchParams.get("error");
  const notCoachError = errorParam === "not_coach" ? t("notAuthorized") : null;

  useEffect(() => {
    if (errorParam === "not_coach") {
      // Auto-clear stale client session if still authenticated
      if (isConvexAuth && !isSigningOut.current) {
        isSigningOut.current = true;
        void signOut().then(() => {
          isSigningOut.current = false;
        });
      }
    }
  }, [errorParam, isConvexAuth, signOut]);

  // Redirect if authenticated as coach (covers both fresh login and revisiting login page)
  useEffect(() => {
    if (!isConvexAuth || profile === undefined || isSigningOut.current) return;

    if (profile?.isCoach) {
      router.replace("/");
    } else if (isConvexAuth && profile && !profile.isCoach) {
      // Client session on admin app (shared cookie collision) — auto-clear it
      isSigningOut.current = true;
      void signOut().then(() => {
        isSigningOut.current = false;
        setError(t("notAuthorized"));
        setSignInComplete(false);
        setIsLoading(false);
      });
    } else if (signInComplete) {
      // Signed in but not a coach — sign out and show error
      isSigningOut.current = true;
      void signOut().then(() => {
        isSigningOut.current = false;
        setError(t("notAuthorized"));
        setSignInComplete(false);
        setIsLoading(false);
      });
    }
  }, [isConvexAuth, profile, signInComplete, router, signOut, t]);

  // GSAP entrance animation
  useEffect(() => {
    if (!cardRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        { y: 40, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: "power3.out" },
      );
    }, cardRef);
    return () => ctx.revert();
  }, []);

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
      const result = await signIn("password", {
        email: data.email,
        password: data.password,
        flow: "signIn",
      });
      if (result.signingIn) {
        setSignInComplete(true);
      }
    } catch {
      // Never expose raw server errors to the user — always show friendly message
      setError(t("invalidCredentials"));
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-stone-50 p-4"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #FF4500 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div ref={cardRef} className="relative w-full max-w-md">
        <div className="rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-200/50">
          <div className="px-8 pt-10 pb-2 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="FitFast" className="mx-auto mb-5 h-14 w-14" />
            <h1
              className="text-2xl font-black tracking-tighter text-stone-900 uppercase italic"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Fit<span className="text-[#FF4500]">Fast</span>
            </h1>
            <p className="mt-1.5 text-sm text-stone-500">{t("signInDescription")}</p>
          </div>

          <div className="px-8 pt-6 pb-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {(error || notCoachError) && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-medium text-red-600">{error ?? notCoachError}</p>
                </div>
              )}

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-stone-700">
                  {t("email")}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5">
                    <Mail className="h-4 w-4 text-stone-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    placeholder="coach@fitfast.app"
                    className="focus:ring-primary/20 focus:border-primary h-11 w-full rounded-xl border border-stone-200 bg-stone-50 ps-10 pe-4 text-sm text-stone-900 transition-all placeholder:text-stone-400 focus:ring-2 focus:outline-none"
                    {...register("email")}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-stone-700"
                >
                  {t("password")}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5">
                    <Lock className="h-4 w-4 text-stone-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="focus:ring-primary/20 focus:border-primary h-11 w-full rounded-xl border border-stone-200 bg-stone-50 ps-10 pe-4 text-sm text-stone-900 transition-all placeholder:text-stone-400 focus:ring-2 focus:outline-none"
                    {...register("password")}
                    disabled={isLoading}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-magnetic flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FF4500] text-sm font-semibold text-white shadow-lg shadow-[#FF4500]/20 transition-colors hover:bg-[#CC3700] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="animate-pulse">{t("signingIn")}...</span>
                ) : (
                  <>
                    {t("signIn")}
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-stone-400">
          Coach Panel &middot; Authorized Access Only
        </p>
      </div>
    </div>
  );
}
