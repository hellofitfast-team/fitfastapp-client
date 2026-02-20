import { getTranslations } from "next-intl/server";
import { Button } from "@fitfast/ui/button";

export default async function LandingPage() {
  const t = await getTranslations("landing");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-lg animate-fade-in">
        {/* Logo / Brand */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-2">
          <span className="text-2xl font-bold text-primary-foreground">FF</span>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            {t("title")}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        {/* Coming Soon Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-medium text-primary">
            {t("comingSoon")}
          </span>
        </div>

        {/* CTA Button — verifies @fitfast/ui integration */}
        <div className="pt-4">
          <Button size="lg" className="w-full sm:w-auto">
            {t("getStarted")}
          </Button>
        </div>
      </div>
    </main>
  );
}
