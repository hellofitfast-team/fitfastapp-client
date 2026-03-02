import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@fitfast/i18n/navigation";
import { Dumbbell, UtensilsCrossed, TrendingUp, MessageSquare, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@fitfast/ui/card";
import { Button } from "@fitfast/ui/button";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "onboarding.welcome" });
  return {
    title: t("title"),
  };
}

function WelcomeContent() {
  const t = useTranslations("onboarding.welcome");

  const features = [
    {
      icon: UtensilsCrossed,
      title: t("features.mealPlans"),
      description: t("features.mealPlansDesc"),
      color: "text-nutrition",
      bg: "bg-nutrition/12",
    },
    {
      icon: Dumbbell,
      title: t("features.workoutPlans"),
      description: t("features.workoutPlansDesc"),
      color: "text-fitness",
      bg: "bg-fitness/12",
    },
    {
      icon: TrendingUp,
      title: t("features.progressTracking"),
      description: t("features.progressTrackingDesc"),
      color: "text-primary",
      bg: "bg-primary/12",
    },
    {
      icon: MessageSquare,
      title: t("features.coachSupport"),
      description: t("features.coachSupportDesc"),
      color: "text-routine",
      bg: "bg-routine/12",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="py-8 text-center">
        <div className="bg-primary/10 mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl">
          <span className="text-primary text-2xl font-bold">FF</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t("title")}</h1>
        <p className="text-muted-foreground mt-3 text-sm">{t("subtitle")}</p>
      </div>

      {/* Features */}
      <div className="grid gap-3 sm:grid-cols-2">
        {features.map((feature, index) => (
          <Card key={index} className="transition-shadow hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${feature.bg}`}
                >
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground mt-1 text-xs">{feature.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA */}
      <div className="space-y-4 text-center">
        <Link href="/initial-assessment">
          <Button size="lg" variant="gradient" className="px-10">
            {t("getStarted")}
            <ArrowRight className="h-5 w-5 rtl:rotate-180" />
          </Button>
        </Link>
        <p className="text-muted-foreground text-xs">{t("completeAssessment")}</p>
      </div>

      {/* Motivational Block */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-2 text-xs">{t("remember")}</p>
          <p className="text-xl leading-tight font-bold">{t("journeyMessage")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function WelcomePage() {
  return <WelcomeContent />;
}
