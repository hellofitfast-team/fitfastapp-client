"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@fitfast/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { cn } from "@fitfast/ui/cn";

export function Navbar() {
    const t = useTranslations("landing");
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div className="fixed top-6 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none">
            <nav
                className={cn(
                    "pointer-events-auto flex items-center justify-between px-6 py-3 rounded-full transition-all duration-300 w-full max-w-5xl",
                    isScrolled
                        ? "bg-[var(--color-background)]/80 backdrop-blur-xl border border-[var(--color-border)] shadow-sm"
                        : "bg-transparent"
                )}
            >
                <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                    <img src="/logo.png" alt="FitFast Icon" className="h-10 w-10 object-contain rounded-2xl shadow-md transition-transform duration-300 group-hover:scale-105" />
                    <span className={cn(
                        "text-2xl font-black italic tracking-tighter uppercase transition-colors duration-300",
                        isScrolled ? "text-[var(--color-foreground)]" : "text-slate-800"
                    )}>
                        Fit<span className="text-[var(--color-primary)]">Fast</span>
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <div className={cn(
                        "transition-colors duration-300",
                        isScrolled ? "text-[var(--color-foreground)]" : "text-slate-700"
                    )}>
                        <LanguageSwitcher />
                    </div>
                    <a href="#pricing">
                        <Button
                            className={cn(
                                "rounded-full font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg overflow-hidden relative group",
                                "bg-[var(--color-primary)] text-white hover:text-white"
                            )}
                        >
                            <span className="relative z-10">{t("heroCta") || "Pick a plan"}</span>
                            <span className={cn(
                                "absolute inset-0 z-0 transition-transform duration-300 translate-y-[100%] group-hover:translate-y-0",
                                "bg-[var(--color-primary-dark)]"
                            )} />
                        </Button>
                    </a>
                </div>
            </nav>
        </div>
    );
}
