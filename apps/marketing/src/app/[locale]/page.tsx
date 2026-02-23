"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  CalendarCheck,
  ChevronRight,
  Dumbbell,
  Globe,
  LineChart,
  Loader2,
  MessageCircle,
  Play,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Link } from "@fitfast/i18n/navigation";
import { Skeleton } from "@fitfast/ui/skeleton";
import { cn } from "@fitfast/ui/cn";
import { CheckoutDrawer } from "@/components/checkout/checkout-drawer";
import type { SelectedPlan } from "@/components/checkout/checkout-form";

gsap.registerPlugin(ScrollTrigger);

// --- Reusable UI Components ---

const FitFastLogo = () => (
  <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 6H28L22 16H32L14 32L18 20H8L10 6Z" fill="var(--color-accent)" />
    <path d="M6 10H20L16 18H24L10 30L13 22H6L6 10Z" fill="currentColor" opacity="0.15" />
  </svg>
);

const MagneticButton = ({
  children,
  className = "",
  onClick,
  variant = "primary",
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline";
}) => {
  const baseClasses =
    "btn-magnetic px-8 py-4 rounded-full font-medium inline-flex items-center justify-center gap-2 text-sm uppercase tracking-wider";

  const variants = {
    primary: "bg-[var(--color-foreground)] text-[var(--color-background)]",
    secondary: "bg-[var(--color-surface)] text-[var(--color-foreground)]",
    outline: "bg-transparent text-[var(--color-foreground)] border border-[var(--color-foreground)]/20",
  };

  const bgVariants = {
    primary: "bg-[var(--color-accent)]",
    secondary: "bg-[var(--color-surface-light)]",
    outline: "bg-[var(--color-foreground)]/5",
  };

  return (
    <button className={`${baseClasses} ${variants[variant]} ${className}`} onClick={onClick}>
      <span className="relative z-10 flex items-center gap-2 transition-colors duration-300">{children}</span>
      <span className={`btn-magnetic-bg ${bgVariants[variant]}`}></span>
    </button>
  );
};

function scrollToSection(id: string) {
  const target = document.getElementById(id);
  if (target) {
    const headerOffset = 100;
    const elementPosition = target.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.scrollY - headerOffset;
    window.scrollTo({ top: offsetPosition, behavior: "smooth" });
  }
}

// --- Sections ---

function Navbar() {
  const t = useTranslations("landing");
  const locale = useLocale();
  const navRef = useRef<HTMLElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const navItems = [
    { name: t("nav.method"), id: "method" },
    { name: t("nav.ecosystem"), id: "ecosystem" },
    { name: t("nav.pricing"), id: "pricing" },
  ];

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(navRef.current, {
        backgroundColor: isScrolled ? "rgba(255, 255, 255, 0.8)" : "transparent",
        backdropFilter: isScrolled ? "blur(24px)" : "blur(0px)",
        borderColor: isScrolled ? "rgba(0, 0, 0, 0.05)" : "transparent",
        padding: isScrolled ? "0.75rem 1.5rem" : "1.5rem 2rem",
        boxShadow: isScrolled ? "0 10px 40px -10px rgba(0,0,0,0.05)" : "none",
        duration: 0.4,
        ease: "power2.inOut",
      });
    });
    return () => ctx.revert();
  }, [isScrolled]);

  const switchLocale = locale === "en" ? "ar" : "en";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 px-4 pointer-events-none">
      <nav
        ref={navRef}
        className="pointer-events-auto flex items-center justify-between w-full max-w-5xl rounded-full border border-transparent transition-all"
      >
        <div className="flex items-center gap-2">
          <FitFastLogo />
          <span className="font-display font-extrabold text-2xl tracking-tighter italic pe-2">FITFAST</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-[var(--color-foreground)]/60">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection(item.id);
              }}
              className="link-lift hover:text-[var(--color-foreground)] transition-colors"
            >
              {item.name}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            locale={switchLocale}
            className="flex items-center justify-center text-[var(--color-foreground)]/60 hover:text-[var(--color-foreground)] transition-colors link-lift"
            aria-label="Toggle Language"
          >
            <Globe className="w-5 h-5" />
          </Link>
          <button
            onClick={() => scrollToSection("pricing")}
            className="bg-[var(--color-foreground)] hover:bg-[var(--color-accent)] text-[var(--color-background)] px-5 py-2.5 rounded-full text-sm font-bold transition-colors"
          >
            {t("startFree")}
          </button>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  const t = useTranslations("landing");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(".hero-badge", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, delay: 0.2 })
        .fromTo(
          ".hero-title-word",
          { y: 100, opacity: 0, rotateX: -40 },
          { y: 0, opacity: 1, rotateX: 0, duration: 1.2, stagger: 0.05 },
          "-=0.6"
        )
        .fromTo(".hero-desc", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, "-=0.8")
        .fromTo(".hero-actions", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, "-=0.6")
        .fromTo(
          ".hero-image-container",
          { scale: 0.9, opacity: 0, y: 60 },
          { scale: 1, opacity: 1, y: 0, duration: 1.5, ease: "power3.out" },
          "-=1"
        );

      gsap.to(".hero-image-inner", {
        yPercent: 20,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-20 px-4 overflow-hidden">
      <div className="relative z-10 max-w-5xl w-full mx-auto text-center flex flex-col items-center mt-12">
        <div className="hero-badge inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-surface)] border border-[var(--color-foreground)]/5 text-sm font-semibold text-[var(--color-foreground)]/80 mb-20">
          <Zap className="w-4 h-4 text-[var(--color-accent)]" />
          {t("badge")}
        </div>

        <h1 className="font-display text-6xl md:text-8xl lg:text-[10rem] font-black tracking-tighter leading-[0.85] rtl:leading-[1.15] mb-16 perspective-[1000px] uppercase italic">
          <div className="overflow-hidden rtl:overflow-visible py-[0.3em] -my-[0.3em]">
            <span className="hero-title-word inline-block origin-bottom">{t("hero1")}</span>{" "}
            <span className="hero-title-word inline-block origin-bottom text-[var(--color-accent)]">{t("hero2")}</span>
          </div>
          <div className="overflow-hidden rtl:overflow-visible py-[0.3em] -my-[0.3em]">
            <span className="hero-title-word inline-block origin-bottom">{t("hero3")}</span>{" "}
            <span className="hero-title-word inline-block origin-bottom">{t("hero4")}</span>
          </div>
        </h1>

        <p className="hero-desc max-w-2xl text-lg md:text-xl text-[var(--color-foreground)]/60 mb-12 font-medium">
          {t("heroDesc")}
        </p>

        <div className="hero-actions flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <MagneticButton className="w-full sm:w-auto" onClick={() => scrollToSection("pricing")}>
            {t("beginTrans")} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </MagneticButton>
          <MagneticButton variant="secondary" className="w-full sm:w-auto">
            <Play className="w-4 h-4 fill-current" /> {t("watchFilm")}
          </MagneticButton>
        </div>
      </div>

      <div className="hero-image-container relative w-full max-w-6xl mx-auto mt-20 aspect-[16/9] md:aspect-[21/9] rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-[var(--color-surface)]">
        <div className="hero-image-inner absolute inset-0 -top-[20%] h-[140%] w-full">
          <Image
            src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=2940&auto=format&fit=crop"
            alt="Athlete training"
            fill
            className="object-cover"
            priority
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </section>
  );
}

function Features() {
  const t = useTranslations("landing");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".feature-card",
        { y: 80, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: { trigger: containerRef.current, start: "top 70%" },
        }
      );

      gsap.utils.toArray<HTMLElement>(".feature-card").forEach((card) => {
        const img = card.querySelector(".feature-img");
        if (img) {
          gsap.to(img, {
            scale: 1.1,
            ease: "none",
            scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true },
          });
        }
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const features = [
    {
      icon: <Zap className="w-6 h-6 text-[var(--color-accent)]" />,
      title: t("feat1Title"),
      desc: t("feat1Desc"),
      image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=2953&auto=format&fit=crop",
    },
    {
      icon: <Dumbbell className="w-6 h-6 text-[var(--color-accent)]" />,
      title: t("feat2Title"),
      desc: t("feat2Desc"),
      image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=2940&auto=format&fit=crop",
    },
    {
      icon: <MessageCircle className="w-6 h-6 text-[var(--color-accent)]" />,
      title: t("feat3Title"),
      desc: t("feat3Desc"),
      image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2940&auto=format&fit=crop",
    },
  ];

  return (
    <section id="method" ref={containerRef} className="py-32 px-4 relative bg-[var(--color-background)]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-20 md:w-2/3">
          <h2 className="font-display text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] rtl:leading-[1.7] mb-6 uppercase italic">
            {t("notTracker")}
            <br />
            <span className="text-[var(--color-foreground)]/20">{t("architect")}</span>
          </h2>
          <p className="text-xl text-[var(--color-foreground)]/60 font-medium">{t("featuresDesc")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="feature-card group relative bg-[var(--color-surface)] rounded-[2rem] p-8 overflow-hidden flex flex-col h-[480px]"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-0">
                <div className="absolute inset-0 w-full h-full">
                  <Image
                    src={feat.image}
                    alt={feat.title}
                    fill
                    className="feature-img object-cover mix-blend-multiply opacity-40 grayscale group-hover:grayscale-0 transition-all duration-700"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-[var(--color-surface)]/80 to-transparent" />
              </div>

              <div className="relative z-10 flex-1 flex flex-col">
                <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center mb-auto group-hover:scale-110 group-hover:rotate-12 group-hover:-translate-y-1 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
                  {feat.icon}
                </div>

                <div className="mt-8 transform group-hover:-translate-y-2 transition-transform duration-500">
                  <h3 className="font-display text-2xl font-bold mb-3">{feat.title}</h3>
                  <p className="text-[var(--color-foreground)]/60 leading-relaxed font-medium">{feat.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BentoGrid() {
  const t = useTranslations("landing");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".bento-item",
        { y: 60, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 1,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: containerRef.current, start: "top 75%" },
        }
      );

      gsap.to(".bento-large-img", {
        yPercent: 15,
        ease: "none",
        scrollTrigger: { trigger: ".bento-large-item", start: "top bottom", end: "bottom top", scrub: true },
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="ecosystem" ref={containerRef} className="py-20 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[320px]">
        {/* Large Item - Check-ins */}
        <div className="bento-item bento-large-item md:col-span-2 md:row-span-2 rounded-[2rem] bg-[var(--color-foreground)] text-[var(--color-background)] p-10 relative overflow-hidden group">
          <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity duration-700">
            <div className="absolute inset-0 -top-[10%] h-[120%] w-full">
              <Image
                src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2940&auto=format&fit=crop"
                alt="Gym"
                fill
                className="bento-large-img object-cover grayscale"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-foreground)] via-[var(--color-foreground)]/80 to-transparent" />
          </div>
          <div className="relative z-10 h-full flex flex-col justify-end">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-accent)] text-white text-xs font-bold uppercase tracking-wider mb-4 w-fit">
              <CalendarCheck className="w-3 h-3" /> {t("checkIn")}
            </div>
            <h3 className="font-display text-4xl md:text-5xl font-black mb-4 uppercase italic">{t("checkInTitle")}</h3>
            <p className="text-[var(--color-background)]/70 text-lg max-w-md font-medium">{t("checkInDesc")}</p>
          </div>
        </div>

        {/* Macro Meals */}
        <div className="bento-item md:col-span-2 rounded-[2rem] bg-[var(--color-surface)] p-8 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 end-0 w-64 h-64 bg-[var(--color-accent)]/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/4 rtl:-translate-x-1/4 group-hover:bg-[var(--color-accent)]/20 transition-colors duration-700" />
          <h3 className="font-display text-2xl font-bold relative z-10 uppercase italic">{t("macroMeals")}</h3>
          <div className="relative z-10 space-y-3">
            {[
              { name: t("meal1"), macros: "45P / 60C / 15F", cal: "555" },
              { name: t("meal2"), macros: "50P / 40C / 20F", cal: "540" },
            ].map((meal, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white shadow-sm group-hover:shadow-md transition-shadow duration-300">
                <div>
                  <div className="font-bold text-sm">{meal.name}</div>
                  <div className="text-xs text-[var(--color-foreground)]/50 mt-1 font-medium">{meal.macros}</div>
                </div>
                <div className="font-mono text-sm font-bold text-[var(--color-accent)]" dir="ltr">
                  {meal.cal} kcal
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coach Access */}
        <div className="bento-item rounded-[2rem] bg-[var(--color-accent)] p-8 flex flex-col justify-between text-white relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <MessageCircle className="w-8 h-8 mb-4 transform group-hover:scale-110 transition-transform duration-500" />
          <div>
            <div className="text-3xl font-display font-black mb-2 italic">
              {t("coachAccess")}
            </div>
            <div className="text-white/90 font-medium">{t("coachAccessDesc")}</div>
          </div>
        </div>

        {/* Progress Tracking */}
        <div className="bento-item rounded-[2rem] bg-[var(--color-surface)] p-8 flex flex-col justify-center items-center text-center group">
          <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-6 transform group-hover:rotate-12 transition-transform duration-500">
            <LineChart className="w-6 h-6 text-[var(--color-foreground)]" />
          </div>
          <div className="text-2xl font-display font-black mb-2 italic">
            {t("progressTracking")}
          </div>
          <div className="text-[var(--color-foreground)]/50 text-sm font-medium">{t("progressTrackingDesc")}</div>
        </div>
      </div>
    </section>
  );
}

// --- Pricing (dynamic from Convex) ---

function PricingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-[2rem] border border-[var(--color-foreground)]/5 bg-[var(--color-background)] p-10 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-12 w-24" />
          <Skeleton className="h-4 w-full" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/6" />
          </div>
          <Skeleton className="h-14 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

function Pricing() {
  const t = useTranslations("landing");
  const locale = useLocale();
  const router = useRouter();
  const plans = useQuery(api.systemConfig.getPlans);
  const containerRef = useRef<HTMLDivElement>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);

  const isLoading = plans === undefined;
  const isEmpty = !isLoading && plans.length === 0;

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".pricing-card",
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: { trigger: containerRef.current, start: "top 70%" },
        }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [isLoading]);

  const handleSelectPlan = (planId: string) => {
    const plan = plans?.find((p) => p.id === planId);
    if (!plan) return;

    setSelectedPlan({
      id: plan.id,
      name: locale === "ar" ? plan.nameAr : plan.name,
      price: plan.price,
      currency: plan.currency,
      duration: locale === "ar" ? plan.durationAr : plan.duration,
    });
    setDrawerOpen(true);
  };

  const handleSuccess = () => {
    setDrawerOpen(false);
    router.push(`/${locale}/confirmation`);
  };

  return (
    <>
      <section id="pricing" ref={containerRef} className="py-32 px-4 relative bg-[var(--color-surface)] scroll-mt-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="font-display text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] rtl:leading-[1.7] mb-6 uppercase italic">
              {t("commit")} <span className="text-[var(--color-accent)]">{t("greatness")}</span>
            </h2>
            <p className="text-xl text-[var(--color-foreground)]/60 font-medium max-w-2xl mx-auto">{t("pricingDesc")}</p>
          </div>

          {isLoading && <PricingSkeleton />}

          {isEmpty && (
            <div className="text-center py-16 text-[var(--color-foreground)]/60 font-medium">{t("plansComing")}</div>
          )}

          {!isLoading && !isEmpty && (
            <div className={cn(
              "grid gap-8 max-w-4xl mx-auto",
              plans.length === 1 ? "grid-cols-1 max-w-lg" : "grid-cols-1 md:grid-cols-2"
            )}>
              {plans.map((plan, idx) => {
                const badge = locale === "ar" ? plan.badgeAr : plan.badge;
                const name = locale === "ar" ? plan.nameAr : plan.name;
                const duration = locale === "ar" ? plan.durationAr : plan.duration;
                const features = locale === "ar" ? plan.featuresAr : plan.features;
                const isHighlighted = Boolean(badge);

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "pricing-card rounded-[2rem] p-10 flex flex-col relative overflow-hidden",
                      isHighlighted
                        ? "bg-[var(--color-foreground)] text-[var(--color-background)]"
                        : "bg-[var(--color-background)] border border-[var(--color-foreground)]/5"
                    )}
                  >
                    {isHighlighted && (
                      <>
                        <div className="absolute top-0 end-0 w-64 h-64 bg-[var(--color-accent)]/20 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/4 rtl:-translate-x-1/4 pointer-events-none" />
                        <div className="absolute top-6 end-6 bg-[var(--color-accent)] text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                          {badge === "Most Popular" ? t("mostPopular") : badge === "Best Value" ? t("bestValue") : badge}
                        </div>
                      </>
                    )}

                    <h3 className="font-display text-2xl font-bold uppercase italic mb-2">{name}</h3>
                    <div className="flex items-baseline gap-2 mb-6" dir="ltr">
                      <span className="text-5xl font-black tracking-tighter">
                        {plan.price.toLocaleString("en-EG")}
                      </span>
                      <span className={cn("font-medium", isHighlighted ? "text-[var(--color-background)]/50" : "text-[var(--color-foreground)]/50")}>
                        {plan.currency} / {duration}
                      </span>
                    </div>

                    <ul className="space-y-4 mb-10 flex-1 relative z-10">
                      {features.map((feat, i) => (
                        <li
                          key={i}
                          className={cn(
                            "flex items-center gap-3 font-medium",
                            isHighlighted ? "text-[var(--color-background)]/90" : "text-[var(--color-foreground)]/80"
                          )}
                        >
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                              isHighlighted ? "bg-[var(--color-accent)]" : "bg-[var(--color-accent)]/10"
                            )}
                          >
                            <ChevronRight className={cn("w-3 h-3 rtl:rotate-180", isHighlighted ? "text-white" : "text-[var(--color-accent)]")} />
                          </div>
                          {feat}
                        </li>
                      ))}
                    </ul>

                    <MagneticButton
                      className={cn(
                        "w-full",
                        isHighlighted ? "!bg-[var(--color-accent)] !text-white" : ""
                      )}
                      variant={isHighlighted ? "primary" : "outline"}
                      onClick={() => handleSelectPlan(plan.id)}
                    >
                      {t("choosePlan")}
                    </MagneticButton>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <CheckoutDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        selectedPlan={selectedPlan}
        onSuccess={handleSuccess}
      />
    </>
  );
}

function CTA() {
  const t = useTranslations("landing");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(".marquee-text", {
        xPercent: -50,
        ease: "none",
        duration: 20,
        repeat: -1,
      });

      const tl = gsap.timeline({
        scrollTrigger: { trigger: containerRef.current, start: "top 60%" },
      });

      tl.fromTo(
        ".cta-stagger",
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: "power3.out" }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="py-32 relative overflow-hidden bg-[var(--color-foreground)] text-[var(--color-background)] mt-20">
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[200%] flex opacity-5 pointer-events-none overflow-hidden" dir="ltr">
        <div className="marquee-text font-display text-[15rem] font-black whitespace-nowrap uppercase italic leading-none">
          FITFAST FITFAST FITFAST FITFAST FITFAST FITFAST
        </div>
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10 px-4">
        <h2 className="cta-stagger font-display text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] rtl:leading-[1.7] mb-6 uppercase italic">
          {t("potential")}
          <br />
          <span className="text-[var(--color-accent)]">{t("unlocked")}</span>
        </h2>
        <p className="cta-stagger text-xl text-[var(--color-background)]/70 mb-10 max-w-2xl mx-auto font-medium">{t("ctaDesc")}</p>
        <div className="cta-stagger">
          <MagneticButton
            variant="primary"
            className="!bg-[var(--color-background)] !text-[var(--color-foreground)]"
            onClick={() => scrollToSection("pricing")}
          >
            {t("startJourney")} <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const t = useTranslations("landing");
  return (
    <footer className="pt-20 pb-10 px-4 bg-[var(--color-background)]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12 mb-20">
        <div className="max-w-sm">
          <div className="flex items-center gap-2 mb-6">
            <FitFastLogo />
            <span className="font-display font-extrabold text-2xl tracking-tighter italic pe-2">FITFAST</span>
          </div>
          <p className="text-[var(--color-foreground)]/50 text-sm leading-relaxed font-medium">{t("footerDesc")}</p>
        </div>

        <div className="flex gap-16">
          <div>
            <h4 className="font-bold mb-6 text-sm uppercase tracking-wider text-[var(--color-foreground)]">{t("platform")}</h4>
            <ul className="space-y-4 text-sm text-[var(--color-foreground)]/60 font-medium">
              <li><a href="#method" className="hover:text-[var(--color-accent)] transition-colors">{t("methodology")}</a></li>
              <li><a href="#method" className="hover:text-[var(--color-accent)] transition-colors">{t("nutrition")}</a></li>
              <li><a href="#method" className="hover:text-[var(--color-accent)] transition-colors">{t("training")}</a></li>
              <li><a href="#ecosystem" className="hover:text-[var(--color-accent)] transition-colors">{t("integrations")}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-sm uppercase tracking-wider text-[var(--color-foreground)]">{t("company")}</h4>
            <ul className="space-y-4 text-sm text-[var(--color-foreground)]/60 font-medium">
              <li><a href="#" className="hover:text-[var(--color-accent)] transition-colors">{t("about")}</a></li>
              <li><a href="#" className="hover:text-[var(--color-accent)] transition-colors">{t("careers")}</a></li>
              <li><a href="#" className="hover:text-[var(--color-accent)] transition-colors">{t("contact")}</a></li>
              <li><a href="#" className="hover:text-[var(--color-accent)] transition-colors">{t("privacy")}</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-[var(--color-foreground)]/10 flex flex-col md:flex-row items-center justify-between text-xs text-[var(--color-foreground)]/40 font-medium">
        <p>{t("rights")}</p>
        <div className="flex gap-6 mt-4 md:mt-0" dir="ltr">
          <a href="#" className="hover:text-[var(--color-foreground)] transition-colors">Twitter</a>
          <a href="#" className="hover:text-[var(--color-foreground)] transition-colors">Instagram</a>
          <a href="#" className="hover:text-[var(--color-foreground)] transition-colors">LinkedIn</a>
        </div>
      </div>
    </footer>
  );
}

// --- Main Page ---

export default function LandingPage() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  return (
    <main className="min-h-screen selection:bg-[var(--color-accent)] selection:text-white">
      <Navbar />
      <Hero />
      <Features />
      <BentoGrid />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  );
}
