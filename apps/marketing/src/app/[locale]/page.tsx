import { getTranslations, setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/sections/hero";
import { Features } from "@/components/sections/features";
import { Pricing } from "@/components/sections/pricing";
import { Testimonials } from "@/components/sections/testimonials";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");

  return (
    <main className="min-h-screen bg-[var(--color-background)]">
      {/* Hero — includes sticky header with language switcher */}
      <Hero />

      {/* Features */}
      <Features />

      {/* Pricing — id="pricing" for smooth scroll target */}
      <Pricing />

      {/* Trust Signals / Testimonials */}
      <Testimonials />

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-[var(--color-border)] bg-[var(--color-background)]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--color-muted-foreground)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--color-primary)] flex items-center justify-center">
              <span className="text-xs font-bold text-white">FF</span>
            </div>
            <span className="font-semibold text-[var(--color-foreground)]">FitFast</span>
          </div>
          <p>© {t("footerRights")}</p>
        </div>
      </footer>
    </main>
  );
}
