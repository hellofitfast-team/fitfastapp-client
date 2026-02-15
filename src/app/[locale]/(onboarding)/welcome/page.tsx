import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Dumbbell, UtensilsCrossed, TrendingUp, MessageSquare, ArrowRight } from "lucide-react";

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
  const tCommon = useTranslations("common");

  const features = [
    {
      icon: UtensilsCrossed,
      title: "PERSONALIZED MEAL PLANS",
      description: "AI-generated meal plans tailored to your goals and preferences",
    },
    {
      icon: Dumbbell,
      title: "CUSTOM WORKOUT PLANS",
      description: "Exercise routines designed for your fitness level and schedule",
    },
    {
      icon: TrendingUp,
      title: "PROGRESS TRACKING",
      description: "Monitor your weight, measurements, and achievements over time",
    },
    {
      icon: MessageSquare,
      title: "COACH SUPPORT",
      description: "Direct communication with your coach through the ticket system",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center border-4 border-black bg-black p-8">
        <div className="inline-flex h-20 w-20 items-center justify-center bg-primary mb-6">
          <span className="text-4xl font-black text-black">FF</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-cream tracking-tight">
          {t("title").toUpperCase()}
        </h1>
        <p className="mt-4 font-mono text-sm tracking-[0.2em] text-primary">
          {t("subtitle").toUpperCase()}
        </p>
      </div>

      {/* Features */}
      <div className="grid gap-0 sm:grid-cols-2">
        {features.map((feature, index) => (
          <div
            key={index}
            className="border-4 border-black p-6 hover:bg-black hover:text-cream transition-colors group -mt-1 sm:-mt-0 sm:-ms-1 first:mt-0 first:ms-0"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-primary group-hover:bg-primary-light">
                <feature.icon className="h-6 w-6 text-white group-hover:text-black" />
              </div>
              <div>
                <h3 className="font-black text-lg tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm font-mono text-neutral-600 group-hover:text-neutral-400">
                  {feature.description.toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center space-y-6">
        <Link href="/initial-assessment">
          <button className="inline-flex items-center gap-3 h-16 px-12 bg-primary text-white font-black text-xl uppercase tracking-wide hover:bg-black transition-colors">
            {t("getStarted").toUpperCase()}
            <ArrowRight className="h-6 w-6 rtl:rotate-180" />
          </button>
        </Link>
        <p className="font-mono text-xs tracking-[0.15em] text-neutral-500">
          COMPLETE YOUR ASSESSMENT TO RECEIVE YOUR PERSONALIZED PLANS
        </p>
      </div>

      {/* Motivational Block */}
      <div className="border-4 border-black bg-neutral-100 p-6 text-center">
        <p className="font-mono text-xs tracking-[0.3em] text-neutral-500 mb-2">REMEMBER</p>
        <p className="text-2xl font-black leading-tight">
          YOUR JOURNEY TO A
          <br />
          <span className="text-primary">BETTER YOU</span>
          <br />
          STARTS NOW
        </p>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return <WelcomeContent />;
}
