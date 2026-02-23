"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

export function Philosophy() {
    const t = useTranslations("landing");
    const sectionRef = useRef<HTMLElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Background Image Parallax
            gsap.to(imageRef.current, {
                yPercent: 20,
                ease: "none",
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: true,
                },
            });

            // Split text reveal simulation (using lines instead of actual SplitText to avoid paid plugins)
            gsap.fromTo(
                ".phil-line",
                { y: 40, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 1,
                    stagger: 0.15,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: "top 60%",
                    },
                }
            );
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={sectionRef}
            className="relative w-full min-h-[70vh] flex items-center justify-center py-24 px-6 overflow-hidden bg-slate-50"
        >
            {/* Background Parallax Texture - High Key / Light */}
            <img
                ref={imageRef}
                src="https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=2940&auto=format&fit=crop"
                alt="Clean architectural texture"
                className="absolute inset-0 w-full h-[120%] object-cover opacity-10 object-center pointer-events-none -top-[10%] grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-white/50 to-slate-50 opacity-90" />

            {/* Content */}
            <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center gap-12">
                <div className="overflow-hidden">
                    <p className="phil-line text-lg sm:text-2xl text-slate-500 font-sans tracking-wide font-medium">
                        {t("philosophyCommon") || "Most fitness apps focus on generic templates."}
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="overflow-hidden py-4 -my-4">
                        <h2 className="phil-line text-4xl sm:text-6xl md:text-7xl font-sans font-bold text-slate-900 tracking-tight leading-tight md:leading-tight">
                            {t("philosophyWeFocus1") || "We focus on:"}
                        </h2>
                    </div>
                    <div className="overflow-hidden py-4 -my-4">
                        <span className="phil-line text-5xl sm:text-8xl md:text-9xl font-drama italic text-[var(--color-primary)] uppercase block leading-tight md:leading-[1.1] mt-4">
                            {t("philosophyWeFocus2") || "SOVEREIGN PERFORMANCE."}
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
}
