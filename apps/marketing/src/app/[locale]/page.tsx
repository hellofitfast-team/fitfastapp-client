"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  ChevronRight,
  Dumbbell,
  Globe,
  LineChart,
  Loader2,
  MessageCircle,
  Minus,
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

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

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
    outline:
      "bg-transparent text-[var(--color-foreground)] border border-[var(--color-foreground)]/20",
  };

  const bgVariants = {
    primary: "bg-[var(--color-accent)]",
    secondary: "bg-[var(--color-surface-light)]",
    outline: "bg-[var(--color-foreground)]/5",
  };

  return (
    <button className={`${baseClasses} ${variants[variant]} ${className}`} onClick={onClick}>
      <span className="relative z-10 flex items-center gap-2 transition-colors duration-300">
        {children}
      </span>
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
    <header className="pointer-events-none fixed top-0 right-0 left-0 z-50 flex justify-center px-4 pt-6">
      <nav
        ref={navRef}
        className="pointer-events-auto flex w-full max-w-5xl items-center justify-between rounded-full border border-transparent transition-all"
      >
        <div className="flex items-center gap-2">
          <FitFastLogo />
          <span className="font-display pe-2 text-2xl font-extrabold tracking-tighter italic">
            FITFAST
          </span>
        </div>

        <div className="hidden items-center gap-8 text-sm font-semibold text-[var(--color-foreground)]/60 md:flex">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection(item.id);
              }}
              className="link-lift transition-colors hover:text-[var(--color-foreground)]"
            >
              {item.name}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            locale={switchLocale}
            className="link-lift flex items-center justify-center text-[var(--color-foreground)]/60 transition-colors hover:text-[var(--color-foreground)]"
            aria-label="Toggle Language"
          >
            <Globe className="h-5 w-5" />
          </Link>
          <button
            onClick={() => scrollToSection("pricing")}
            className="rounded-full bg-[var(--color-foreground)] px-5 py-2.5 text-sm font-bold text-[var(--color-background)] transition-colors hover:bg-[var(--color-accent)]"
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

      tl.fromTo(
        ".hero-badge",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, delay: 0.2 },
      )
        .fromTo(
          ".hero-title-word",
          { y: 100, opacity: 0, rotateX: -40 },
          { y: 0, opacity: 1, rotateX: 0, duration: 1.2, stagger: 0.05 },
          "-=0.6",
        )
        .fromTo(".hero-desc", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, "-=0.8")
        .fromTo(
          ".hero-actions",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8 },
          "-=0.6",
        )
        .fromTo(
          ".hero-image-container",
          { scale: 0.9, opacity: 0, y: 60 },
          { scale: 1, opacity: 1, y: 0, duration: 1.5, ease: "power3.out" },
          "-=1",
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
    <section
      ref={containerRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-32 pb-20"
    >
      <div className="relative z-10 mx-auto mt-12 flex w-full max-w-5xl flex-col items-center text-center">
        <div className="hero-badge mb-20 inline-flex items-center gap-2 rounded-full border border-[var(--color-foreground)]/5 bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-foreground)]/80">
          <Zap className="h-4 w-4 text-[var(--color-accent)]" />
          {t("badge")}
        </div>

        <h1 className="font-display mb-16 text-6xl leading-[0.85] font-black tracking-tighter uppercase italic perspective-[1000px] md:text-8xl lg:text-[10rem] rtl:leading-[1.15]">
          <div className="-my-[0.3em] overflow-hidden py-[0.3em] rtl:overflow-visible">
            <span className="hero-title-word inline-block origin-bottom">{t("hero1")}</span>{" "}
            <span className="hero-title-word inline-block origin-bottom text-[var(--color-accent)]">
              {t("hero2")}
            </span>
          </div>
          <div className="-my-[0.3em] overflow-hidden py-[0.3em] rtl:overflow-visible">
            <span className="hero-title-word inline-block origin-bottom">{t("hero3")}</span>{" "}
            <span className="hero-title-word inline-block origin-bottom">{t("hero4")}</span>
          </div>
        </h1>

        <p className="hero-desc mb-12 max-w-2xl text-lg font-medium text-[var(--color-foreground)]/60 md:text-xl">
          {t("heroDesc")}
        </p>

        <div className="hero-actions flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
          <MagneticButton className="w-full sm:w-auto" onClick={() => scrollToSection("pricing")}>
            {t("beginTrans")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </MagneticButton>
          <MagneticButton variant="secondary" className="w-full sm:w-auto">
            <Play className="h-4 w-4 fill-current" /> {t("watchFilm")}
          </MagneticButton>
        </div>
      </div>

      <div className="hero-image-container relative mx-auto mt-20 aspect-[16/9] w-full max-w-6xl overflow-hidden rounded-[2rem] bg-[var(--color-surface)] md:aspect-[21/9] md:rounded-[3rem]">
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
        },
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
      icon: <Zap className="h-6 w-6 text-[var(--color-accent)]" />,
      title: t("feat1Title"),
      desc: t("feat1Desc"),
      image:
        "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=2953&auto=format&fit=crop",
    },
    {
      icon: <Dumbbell className="h-6 w-6 text-[var(--color-accent)]" />,
      title: t("feat2Title"),
      desc: t("feat2Desc"),
      image:
        "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=2940&auto=format&fit=crop",
    },
    {
      icon: <MessageCircle className="h-6 w-6 text-[var(--color-accent)]" />,
      title: t("feat3Title"),
      desc: t("feat3Desc"),
      image:
        "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2940&auto=format&fit=crop",
    },
  ];

  return (
    <section
      id="method"
      ref={containerRef}
      className="relative bg-[var(--color-background)] px-4 py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-20 md:w-2/3">
          <h2 className="font-display mb-6 text-5xl leading-[0.9] font-black tracking-tighter uppercase italic md:text-7xl rtl:leading-[1.7]">
            {t("notTracker")}
            <br />
            <span className="text-[var(--color-foreground)]/20">{t("architect")}</span>
          </h2>
          <p className="text-xl font-medium text-[var(--color-foreground)]/60">
            {t("featuresDesc")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="feature-card group relative flex h-[480px] flex-col overflow-hidden rounded-[2rem] bg-[var(--color-surface)] p-8"
            >
              <div className="absolute inset-0 z-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100">
                <div className="absolute inset-0 h-full w-full">
                  <Image
                    src={feat.image}
                    alt={feat.title}
                    fill
                    className="feature-img object-cover opacity-40 mix-blend-multiply grayscale transition-all duration-700 group-hover:grayscale-0"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-[var(--color-surface)]/80 to-transparent" />
              </div>

              <div className="relative z-10 flex flex-1 flex-col">
                <div className="mb-auto flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-y-1 group-hover:scale-110 group-hover:rotate-12">
                  {feat.icon}
                </div>

                <div className="mt-8 transform transition-transform duration-500 group-hover:-translate-y-2">
                  <h3 className="font-display mb-3 text-2xl font-bold">{feat.title}</h3>
                  <p className="leading-relaxed font-medium text-[var(--color-foreground)]/60">
                    {feat.desc}
                  </p>
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
        },
      );

      gsap.to(".bento-large-img", {
        yPercent: 15,
        ease: "none",
        scrollTrigger: {
          trigger: ".bento-large-item",
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="ecosystem" ref={containerRef} className="px-4 py-20">
      <div className="mx-auto grid max-w-7xl auto-rows-[320px] grid-cols-1 gap-6 md:grid-cols-4">
        {/* Large Item - Check-ins */}
        <div className="bento-item bento-large-item group relative overflow-hidden rounded-[2rem] bg-[var(--color-foreground)] p-10 text-[var(--color-background)] md:col-span-2 md:row-span-2">
          <div className="absolute inset-0 opacity-40 transition-opacity duration-700 group-hover:opacity-60">
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
          <div className="relative z-10 flex h-full flex-col justify-end">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-bold tracking-wider text-white uppercase">
              <CalendarCheck className="h-3 w-3" /> {t("checkIn")}
            </div>
            <h3 className="font-display mb-4 text-4xl font-black uppercase italic md:text-5xl">
              {t("checkInTitle")}
            </h3>
            <p className="max-w-md text-lg font-medium text-[var(--color-background)]/70">
              {t("checkInDesc")}
            </p>
          </div>
        </div>

        {/* Macro Meals */}
        <div className="bento-item group relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-[var(--color-surface)] p-8 md:col-span-2">
          <div className="absolute end-0 top-0 h-64 w-64 translate-x-1/4 -translate-y-1/2 rounded-full bg-[var(--color-accent)]/10 blur-[60px] transition-colors duration-700 group-hover:bg-[var(--color-accent)]/20 rtl:-translate-x-1/4" />
          <h3 className="font-display relative z-10 text-2xl font-bold uppercase italic">
            {t("macroMeals")}
          </h3>
          <div className="relative z-10 space-y-3">
            {[
              { name: t("meal1"), macros: "45P / 60C / 15F", cal: "555" },
              { name: t("meal2"), macros: "50P / 40C / 20F", cal: "540" },
            ].map((meal, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm transition-shadow duration-300 group-hover:shadow-md"
              >
                <div>
                  <div className="text-sm font-bold">{meal.name}</div>
                  <div className="mt-1 text-xs font-medium text-[var(--color-foreground)]/50">
                    {meal.macros}
                  </div>
                </div>
                <div className="font-mono text-sm font-bold text-[var(--color-accent)]" dir="ltr">
                  {meal.cal} kcal
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coach Access */}
        <div className="bento-item group relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-[var(--color-accent)] p-8 text-white">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <MessageCircle className="mb-4 h-8 w-8 transform transition-transform duration-500 group-hover:scale-110" />
          <div>
            <div className="font-display mb-2 text-3xl font-black italic">{t("coachAccess")}</div>
            <div className="font-medium text-white/90">{t("coachAccessDesc")}</div>
          </div>
        </div>

        {/* Progress Tracking */}
        <div className="bento-item group flex flex-col items-center justify-center rounded-[2rem] bg-[var(--color-surface)] p-8 text-center">
          <div className="mb-6 flex h-16 w-16 transform items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-500 group-hover:rotate-12">
            <LineChart className="h-6 w-6 text-[var(--color-foreground)]" />
          </div>
          <div className="font-display mb-2 text-2xl font-black italic">
            {t("progressTracking")}
          </div>
          <div className="text-sm font-medium text-[var(--color-foreground)]/50">
            {t("progressTrackingDesc")}
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Pricing (dynamic from Convex) ---

function PricingSkeleton() {
  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="space-y-4 rounded-[2rem] border border-[var(--color-foreground)]/5 bg-[var(--color-background)] p-10"
        >
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
        },
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
      <section
        id="pricing"
        ref={containerRef}
        className="relative scroll-mt-16 bg-[var(--color-surface)] px-4 py-32"
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-20 text-center">
            <h2 className="font-display mb-6 text-5xl leading-[0.9] font-black tracking-tighter uppercase italic md:text-7xl rtl:leading-[1.7]">
              {t("commit")} <span className="text-[var(--color-accent)]">{t("greatness")}</span>
            </h2>
            <p className="mx-auto max-w-2xl text-xl font-medium text-[var(--color-foreground)]/60">
              {t("pricingDesc")}
            </p>
          </div>

          {isLoading && <PricingSkeleton />}

          {isEmpty && (
            <div className="py-16 text-center font-medium text-[var(--color-foreground)]/60">
              {t("plansComing")}
            </div>
          )}

          {!isLoading && !isEmpty && (
            <div
              className={cn(
                "mx-auto grid max-w-4xl gap-8",
                plans.length === 1 ? "max-w-lg grid-cols-1" : "grid-cols-1 md:grid-cols-2",
              )}
            >
              {[...plans]
                .sort((a, b) => a.price - b.price)
                .map((plan, idx) => {
                  const badge = locale === "ar" ? plan.badgeAr : plan.badge;
                  const name = locale === "ar" ? plan.nameAr : plan.name;
                  const duration = locale === "ar" ? plan.durationAr : plan.duration;
                  const features =
                    locale === "ar"
                      ? plan.featuresAr?.length
                        ? plan.featuresAr
                        : plan.features
                      : plan.features;
                  const isHighlighted = Boolean(badge);

                  return (
                    <div
                      key={plan.id}
                      className={cn(
                        "pricing-card relative flex flex-col rounded-[2rem] p-10",
                        isHighlighted
                          ? "overflow-visible bg-[var(--color-foreground)] text-[var(--color-background)]"
                          : "overflow-hidden border border-[var(--color-foreground)]/5 bg-[var(--color-background)]",
                      )}
                    >
                      {isHighlighted && (
                        <>
                          <div className="pointer-events-none absolute end-0 top-0 h-64 w-64 translate-x-1/4 -translate-y-1/2 rounded-full bg-[var(--color-accent)]/20 blur-[60px] rtl:-translate-x-1/4" />
                          <div className="absolute top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-xs font-bold tracking-wider whitespace-nowrap text-white uppercase">
                            {badge === "Most Popular"
                              ? t("mostPopular")
                              : badge === "Best Value"
                                ? t("bestValue")
                                : badge}
                          </div>
                        </>
                      )}

                      <h3 className="font-display mb-2 text-2xl font-bold uppercase italic">
                        {name}
                      </h3>
                      <div className="mb-6 flex items-baseline gap-2" dir="ltr">
                        <span className="text-5xl font-black tracking-tighter">
                          {plan.price.toLocaleString("en-EG")}
                        </span>
                        <span
                          className={cn(
                            "font-medium",
                            isHighlighted
                              ? "text-[var(--color-background)]/50"
                              : "text-[var(--color-foreground)]/50",
                          )}
                        >
                          {plan.currency} / {duration}
                        </span>
                      </div>

                      <ul className="relative z-10 mb-6 flex-1 space-y-4">
                        {features.slice(0, 5).map((feat, i) => (
                          <li
                            key={i}
                            className={cn(
                              "flex items-center gap-3 font-medium",
                              isHighlighted
                                ? "text-[var(--color-background)]/90"
                                : "text-[var(--color-foreground)]/80",
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                                isHighlighted
                                  ? "bg-[var(--color-accent)]"
                                  : "bg-[var(--color-accent)]/10",
                              )}
                            >
                              <ChevronRight
                                className={cn(
                                  "h-3 w-3 rtl:rotate-180",
                                  isHighlighted ? "text-white" : "text-[var(--color-accent)]",
                                )}
                              />
                            </div>
                            {feat}
                          </li>
                        ))}
                      </ul>

                      {features.length > 5 && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            document
                              .getElementById("plan-comparison")
                              ?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className={cn(
                            "mb-8 text-start text-sm underline underline-offset-4",
                            isHighlighted
                              ? "text-[var(--color-background)]/40 hover:text-[var(--color-background)]/60"
                              : "text-[var(--color-foreground)]/40 hover:text-[var(--color-foreground)]/60",
                          )}
                        >
                          {t("viewAllFeatures")}
                        </button>
                      )}

                      <MagneticButton
                        className={cn(
                          "w-full",
                          isHighlighted ? "!bg-[var(--color-accent)] !text-white" : "",
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

          {/* ── Plan Comparison Table ── */}
          {!isLoading &&
            !isEmpty &&
            plans.length > 1 &&
            (() => {
              const sorted = [...plans].sort((a, b) => a.price - b.price);
              // Build a union of all features across plans, preserving order from first plan then appending extras
              const allFeatures: string[] = [];
              const allFeaturesAr: string[] = [];
              for (const p of sorted) {
                const feats = p.features;
                const featsAr = p.featuresAr;
                feats.forEach((f, i) => {
                  if (!allFeatures.includes(f)) {
                    allFeatures.push(f);
                    allFeaturesAr.push(featsAr?.[i] || f);
                  }
                });
              }

              return (
                <div id="plan-comparison" className="mx-auto mt-24 max-w-5xl scroll-mt-24">
                  <div className="mb-12 text-center">
                    <h3 className="font-display mb-4 text-4xl leading-[0.9] font-black tracking-tighter uppercase italic md:text-5xl rtl:leading-[1.7]">
                      {t("compareTitle")}{" "}
                      <span className="text-[var(--color-accent)]">{t("compareHighlight")}</span>
                    </h3>
                    <p className="text-lg font-medium text-[var(--color-foreground)]/60">
                      {t("compareDesc")}
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-[var(--color-foreground)]/10 bg-[var(--color-background)]">
                    {/* Header row */}
                    <div
                      className="grid items-center border-b border-[var(--color-foreground)]/10 bg-[var(--color-surface)]"
                      style={{ gridTemplateColumns: `2fr repeat(${sorted.length}, 1fr)` }}
                    >
                      <div className="px-6 py-4 text-sm font-bold tracking-wider text-[var(--color-foreground)]/50 uppercase">
                        {t("feature")}
                      </div>
                      {sorted.map((plan) => {
                        const name = locale === "ar" ? plan.nameAr : plan.name;
                        return (
                          <div
                            key={plan.id}
                            className="px-4 py-4 text-center text-sm font-bold tracking-wide text-[var(--color-foreground)] uppercase"
                          >
                            {name}
                          </div>
                        );
                      })}
                    </div>

                    {/* Feature rows */}
                    {allFeatures.map((feat, fi) => {
                      const label = locale === "ar" ? allFeaturesAr[fi] : feat;
                      return (
                        <div
                          key={feat}
                          className={cn(
                            "grid items-center border-b border-[var(--color-foreground)]/5 last:border-0",
                            fi % 2 === 0
                              ? "bg-[var(--color-background)]"
                              : "bg-[var(--color-surface)]/50",
                          )}
                          style={{ gridTemplateColumns: `2fr repeat(${sorted.length}, 1fr)` }}
                        >
                          <div className="px-6 py-3.5 text-sm font-medium text-[var(--color-foreground)]/80">
                            {label}
                          </div>
                          {sorted.map((plan) => {
                            const has = plan.features.includes(feat);
                            return (
                              <div
                                key={plan.id}
                                className="flex items-center justify-center px-4 py-3.5"
                              >
                                {has ? (
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
                                    <Check className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                                  </div>
                                ) : (
                                  <Minus className="h-4 w-4 text-[var(--color-foreground)]/20" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
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
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: "power3.out" },
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative mt-20 overflow-hidden bg-[var(--color-foreground)] py-32 text-[var(--color-background)]"
    >
      <div
        className="pointer-events-none absolute top-1/2 left-0 flex w-[200%] -translate-y-1/2 overflow-hidden opacity-5"
        dir="ltr"
      >
        <div className="marquee-text font-display text-[15rem] leading-none font-black whitespace-nowrap uppercase italic">
          FITFAST FITFAST FITFAST FITFAST FITFAST FITFAST
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
        <h2 className="cta-stagger font-display mb-6 text-5xl leading-[0.9] font-black tracking-tighter uppercase italic md:text-8xl rtl:leading-[1.7]">
          {t("potential")}
          <br />
          <span className="text-[var(--color-accent)]">{t("unlocked")}</span>
        </h2>
        <p className="cta-stagger mx-auto mb-10 max-w-2xl text-xl font-medium text-[var(--color-background)]/70">
          {t("ctaDesc")}
        </p>
        <div className="cta-stagger">
          <MagneticButton
            variant="primary"
            className="!bg-[var(--color-background)] !text-[var(--color-foreground)]"
            onClick={() => scrollToSection("pricing")}
          >
            {t("startJourney")} <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const t = useTranslations("landing");
  const socialLinks = useQuery(api.systemConfig.getSocialLinks) ?? {};

  const socialEntries = Object.entries(socialLinks).filter(([, url]) => url);
  const socialLabels: Record<string, string> = {
    twitter: "Twitter",
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    facebook: "Facebook",
    linkedin: "LinkedIn",
  };

  return (
    <footer className="bg-[var(--color-background)] px-4 pt-20 pb-10">
      <div className="mx-auto mb-16 flex max-w-7xl flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-2">
          <FitFastLogo />
          <span className="font-display pe-2 text-2xl font-extrabold tracking-tighter italic">
            FITFAST
          </span>
        </div>
        <p className="max-w-md text-sm leading-relaxed font-medium text-[var(--color-foreground)]/50">
          {t("footerDesc")}
        </p>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between border-t border-[var(--color-foreground)]/10 pt-8 text-xs font-medium text-[var(--color-foreground)]/40 md:flex-row">
        <p>{t("rights")}</p>
        {socialEntries.length > 0 && (
          <div className="mt-4 flex gap-6 md:mt-0" dir="ltr">
            {socialEntries.map(([key, url]) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-[var(--color-foreground)]"
              >
                {socialLabels[key] ?? key}
              </a>
            ))}
          </div>
        )}
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
    <main className="min-h-screen overflow-x-hidden selection:bg-[var(--color-accent)] selection:text-white">
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
