"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "@fitfast/i18n/navigation";
import { useSignIn } from "@clerk/nextjs";
import { ArrowLeft, Mail, CheckCircle2, Zap, Loader2 } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const { signIn, isLoaded } = useSignIn();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    if (!isLoaded || !signIn) return;
    setIsLoading(true);
    setError(null);

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: data.email,
      });
      setSentEmail(data.email);
      setEmailSent(true);
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message?: string }> };
      setError(
        clerkError.errors?.[0]?.message ||
          "An unexpected error occurred. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
        <div className="p-6 text-center border-b border-border bg-success-500/5">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-success-500/10 mb-3">
            <CheckCircle2 className="h-7 w-7 text-success-500" />
          </div>
          <h1 className="text-2xl font-bold">{t("emailSent")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("emailSentDescription")}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-lg bg-neutral-50 border border-border p-3.5 text-center">
            <p className="text-xs text-muted-foreground mb-1">
              {t("email")}
            </p>
            <p className="font-medium text-sm">{sentEmail}</p>
          </div>
          <Link href="/set-password" className="block">
            <button className="w-full py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
              {t("enterCode")}
            </button>
          </Link>
          <Link href="/login" className="block">
            <button className="w-full py-3 rounded-lg border border-border text-sm font-medium hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {tCommon("back")}
            </button>
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
          <Zap className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">{t("magicLink")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("magicLinkDescription")}</p>
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
                autoComplete="email"
                className="w-full h-11 ps-10 pe-4 rounded-lg border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                {...register("email")}
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-error-500">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !isLoaded}
            className="w-full py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.97] flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{t("sendingMagicLink")}...</>
            ) : (
              <>{t("sendMagicLink")}<Zap className="h-4 w-4" /></>
            )}
          </button>
        </form>

        <div className="mt-4">
          <Link href="/login">
            <button className="w-full py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {tCommon("back")}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
