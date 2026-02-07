"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Mail, CheckCircle2, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const magicLinkSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type MagicLinkFormData = z.infer<typeof magicLinkSchema>;

export default function MagicLinkPage() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MagicLinkFormData>({
    resolver: zodResolver(magicLinkSchema),
  });

  const onSubmit = async (data: MagicLinkFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/callback`;

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      setSentEmail(data.email);
      setEmailSent(true);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="border-4 border-black bg-[#FFFEF5] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {/* Success Header */}
        <div className="border-b-4 border-black bg-[#00FF94] p-6 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center bg-black mb-4">
            <CheckCircle2 className="h-8 w-8 text-[#00FF94]" />
          </div>
          <h1 className="text-3xl font-black text-black tracking-tight">
            {t("emailSent").toUpperCase()}
          </h1>
          <p className="font-mono text-xs tracking-[0.2em] text-black/70 mt-2">
            {t("emailSentDescription").toUpperCase()}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="border-4 border-black p-4 bg-neutral-100">
            <p className="font-mono text-xs tracking-[0.2em] text-neutral-500 text-center mb-2">
              EMAIL SENT TO
            </p>
            <p className="text-center font-black text-lg uppercase">
              {sentEmail}
            </p>
          </div>

          <Link href="/login" className="block">
            <button className="w-full h-14 border-4 border-black bg-[#FFFEF5] font-black text-lg uppercase tracking-wide hover:bg-black hover:text-[#FFFEF5] transition-colors flex items-center justify-center gap-3">
              <ArrowLeft className="h-5 w-5" />
              {tCommon("back").toUpperCase()} TO {t("login").toUpperCase()}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="border-4 border-black bg-[#FFFEF5] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      {/* Header */}
      <div className="border-b-4 border-black bg-black p-6 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center bg-[#00FF94] mb-4">
          <Zap className="h-8 w-8 text-black" />
        </div>
        <h1 className="text-3xl font-black text-[#FFFEF5] tracking-tight">
          {t("magicLink").toUpperCase()}
        </h1>
        <p className="font-mono text-xs tracking-[0.2em] text-[#00FF94] mt-2">
          {t("magicLinkDescription").toUpperCase()}
        </p>
      </div>

      {/* Form */}
      <div className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="border-4 border-[#FF3B00] bg-[#FF3B00]/10 p-4">
              <p className="font-bold text-[#FF3B00] text-sm uppercase">{error}</p>
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
                autoComplete="email"
                className="w-full h-14 pl-16 pr-4 border-4 border-black bg-[#FFFEF5] font-mono text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:ring-0 focus:border-black focus:bg-white transition-colors"
                {...register("email")}
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="mt-2 font-mono text-xs text-[#FF3B00] uppercase">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-14 bg-[#FF3B00] text-white font-black text-lg uppercase tracking-wide hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <span className="animate-pulse">{t("sendingMagicLink").toUpperCase()}...</span>
            ) : (
              <>
                {t("sendMagicLink").toUpperCase()}
                <Zap className="h-5 w-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6">
          <Link href="/login">
            <button className="w-full h-12 border-4 border-black bg-[#FFFEF5] font-bold text-sm uppercase tracking-wide hover:bg-black hover:text-[#FFFEF5] transition-colors flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {tCommon("back").toUpperCase()} TO {t("login").toUpperCase()}
            </button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-4 border-black bg-neutral-100 p-4 text-center">
        <p className="font-mono text-xs tracking-[0.15em] text-neutral-500">
          NO PASSWORD REQUIRED • INSTANT ACCESS
        </p>
      </div>
    </div>
  );
}
