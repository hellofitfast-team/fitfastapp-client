import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@fitfast/i18n/navigation";
import { Dumbbell, UtensilsCrossed, TrendingUp, MessageSquare, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@fitfast/ui/card";
import { Button } from "@fitfast/ui/button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
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
      title: "Personalized Meal Plans",
      description: "AI-generated meal plans tailored to your goals and preferences",
      color: "text-[#10B981]",
      bg: "bg-[#10B981]/12",
    },
    {
      icon: Dumbbell,
      title: "Custom Workout Plans",
      description: "Exercise routines designed for your fitness level and schedule",
      color: "text-[#F97316]",
      bg: "bg-[#F97316]/12",
    },
    {
      icon: TrendingUp,
      title: "Progress Tracking",
      description: "Monitor your weight, measurements, and achievements over time",
      color: "text-[#4169E1]",
      bg: "bg-[#4169E1]/12",
    },
    {
      icon: MessageSquare,
      title: "Coach Support",
      description: "Direct communication with your coach through the ticket system",
      color: "text-[#8B5CF6]",
      bg: "bg-[#8B5CF6]/12",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-8">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
          <span className="text-2xl font-bold text-primary">FF</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {/* Features */}
      <div className="grid gap-3 sm:grid-cols-2">
        {features.map((feature, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${feature.bg}`}>
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center space-y-4">
        <Link href="/initial-assessment">
          <Button size="lg" variant="gradient" className="px-10">
            {t("getStarted")}
            <ArrowRight className="h-5 w-5 rtl:rotate-180" />
          </Button>
        </Link>
        <p className="text-xs text-muted-foreground">
          Complete your assessment to receive your personalized plans
        </p>
      </div>

      {/* Motivational Block */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6 text-center">
          <p className="text-xs text-muted-foreground mb-2">Remember</p>
          <p className="text-xl font-bold leading-tight">
            Your journey to a{" "}
            <span className="text-primary">better you</span>{" "}
            starts now
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function WelcomePage() {
  return <WelcomeContent />;
}
