"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@fitfast/ui/cn";

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

const protocols = [
    {
        id: "01",
        titleKey: "protocol1Title",
        descKey: "protocol1Desc",
        defaultTitle: "Assimilation",
        defaultDesc: "Ingesting core metrics, metabolic baselines, and physical architecture.",
    },
    {
        id: "02",
        titleKey: "protocol2Title",
        descKey: "protocol2Desc",
        defaultTitle: "Synthesis",
        defaultDesc: "Processing millions of permutations to forge the exact optimal trajectory.",
    },
    {
        id: "03",
        titleKey: "protocol3Title",
        descKey: "protocol3Desc",
        defaultTitle: "Execution",
        defaultDesc: "Uncompromising daily alignment. No deviation. Pure sovereign performance.",
    },
];

export function Protocol() {
    const t = useTranslations("landing");
    const containerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            const cards = gsap.utils.toArray<HTMLElement>(".protocol-card");

            cards.forEach((card, i) => {
                // Sticky Stacking Animation
                if (i < cards.length - 1) {
                    gsap.to(card, {
                        scale: 0.9,
                        opacity: 0.5,
                        filter: "blur(20px)",
                        scrollTrigger: {
                            trigger: cards[i + 1],
                            start: "top 80%",
                            end: "top 20%",
                            scrub: true,
                        },
                    });
                }
            });

            // SVG Animations
            // 1. Rotating Motif
            gsap.to(".anim-motif", {
                rotation: 360,
                repeat: -1,
                duration: 20,
                ease: "none"
            });

            // 2. Laser Line
            gsap.fromTo(".anim-laser",
                { top: 0 },
                { top: "100%", repeat: -1, duration: 2.5, ease: "power1.inOut", yoyo: true }
            );

            // 3. EKG Pulse (stroke-dashoffset)
            gsap.to(".anim-ekg", {
                strokeDashoffset: 0,
                repeat: -1,
                duration: 3,
                ease: "linear"
            });

        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={containerRef} className="relative w-full bg-white py-24 border-y border-[var(--color-border)]">
            <div className="max-w-6xl mx-auto px-6 mb-24 text-center">
                <h2 className="text-4xl md:text-6xl font-bold font-sans text-slate-900 tracking-tight mb-4">
                    The System Protocol
                </h2>
                <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                    We don't do guesswork. Every variable is measured, computed, and acted upon.
                </p>
            </div>

            <div className="relative flex flex-col gap-0 pb-32">
                {protocols.map((protocol, i) => (
                    <div
                        key={protocol.id}
                        className="protocol-card w-full h-[80vh] sticky top-[10vh] flex items-center justify-center px-4 md:px-12 origin-top"
                    >
                        <div className="w-full max-w-5xl bg-white rounded-[3rem] p-8 md:p-16 flex flex-col md:flex-row items-center gap-12 border border-slate-200 shadow-2xl relative overflow-hidden h-full max-h-[600px]">

                            {/* Graphic Side */}
                            <div className="w-full md:w-1/2 h-48 md:h-full bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-center relative overflow-hidden">
                                {/* SVG 1: Rotating Motif */}
                                {i === 0 && (
                                    <svg className="anim-motif w-48 h-48 sm:w-64 sm:h-64 opacity-80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="50" cy="50" r="40" stroke="var(--color-primary)" strokeWidth="1" strokeDasharray="4 4" />
                                        <circle cx="50" cy="50" r="30" stroke="var(--color-primary)" strokeWidth="0.5" />
                                        <path d="M50 10 L50 90 M10 50 L90 50 M22 22 L78 78 M78 22 L22 78" stroke="var(--color-primary)" strokeWidth="0.5" strokeOpacity="0.5" />
                                        <rect x="35" y="35" width="30" height="30" stroke="var(--color-primary)" strokeWidth="1" transform="rotate(45 50 50)" />
                                    </svg>
                                )}

                                {/* SVG 2: Laser Grid */}
                                {i === 1 && (
                                    <div className="w-full h-full relative p-8">
                                        {/* Grid Pattern */}
                                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(var(--color-primary) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                                        {/* Laser */}
                                        <div className="anim-laser absolute left-0 right-0 h-[3px] bg-[var(--color-primary)] shadow-[0_0_20px_var(--color-primary)]" />
                                    </div>
                                )}

                                {/* SVG 3: EKG Waveform */}
                                {i === 2 && (
                                    <svg className="w-full h-32 px-8" viewBox="0 0 500 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path
                                            className="anim-ekg"
                                            d="M0 50 H 100 L 120 20 L 150 90 L 180 50 H 320 L 340 20 L 370 90 L 400 50 H 500"
                                            stroke="var(--color-primary)"
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeDasharray="1000"
                                            strokeDashoffset="1000"
                                            style={{ filter: "drop-shadow(0 4px 6px rgba(15, 82, 186, 0.4))" }}
                                        />
                                    </svg>
                                )}
                            </div>

                            {/* Text Side */}
                            <div className="w-full md:w-1/2 flex flex-col">
                                <span className="text-sm font-sans tracking-widest text-[var(--color-primary)] mb-4 uppercase font-bold bg-[var(--color-primary)]/10 w-fit px-3 py-1 rounded-full">
                                    Phase {protocol.id}
                                </span>
                                <h3 className="text-4xl md:text-5xl font-bold font-sans text-slate-900 mb-6 tracking-tight">
                                    {t(protocol.titleKey as any) || protocol.defaultTitle}
                                </h3>
                                <p className="text-lg text-slate-500 leading-relaxed font-medium">
                                    {t(protocol.descKey as any) || protocol.defaultDesc}
                                </p>
                            </div>

                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
