import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface ConfirmationPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ConfirmationPage({ params }: ConfirmationPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("confirmation");

  return (
    <main className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center shadow-sm">
          {/* Checkmark icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-[var(--color-primary)]" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
            {t("title")}
          </h1>

          {/* Subtitle */}
          <p className="text-base font-medium text-[var(--color-foreground)] mb-4">
            {t("subtitle")}
          </p>

          {/* Explanation */}
          <p className="text-sm text-[var(--color-muted-foreground)] mb-4 leading-relaxed">
            {t("explanation")}
          </p>

          {/* Timeline */}
          <div className="rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 px-4 py-3 mb-8">
            <p className="text-sm text-[var(--color-primary)] font-medium">
              {t("timeline")}
            </p>
          </div>

          {/* Back to home */}
          <Link
            href={`/${locale}`}
            className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-sm hover:bg-[var(--color-primary)]/90 transition-colors"
          >
            {t("backToHome")}
          </Link>
        </div>
      </div>
    </main>
  );
}
