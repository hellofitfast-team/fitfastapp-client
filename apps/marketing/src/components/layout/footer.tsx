import { useTranslations } from "next-intl";

export function Footer() {
    const t = useTranslations("landing");

    return (
        <footer className="py-12 px-6 bg-slate-900 rounded-t-[4rem] mt-12 relative overflow-hidden">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex flex-col items-center md:items-start gap-4">
                    <div className="flex items-center gap-4 mb-2">
                        <img src="/logo.png" alt="FitFast Icon" className="h-14 w-14 object-contain rounded-3xl shadow-lg opacity-90" />
                        <span className="text-4xl font-black italic tracking-tighter uppercase text-white">
                            Fit<span className="text-[var(--color-primary-light)]">Fast</span>
                        </span>
                    </div>
                    <p className="text-slate-400 text-sm max-w-xs text-center md:text-left">
                        {t("footerRights")}
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-white/5 px-5 py-2.5 rounded-full border border-white/10 shadow-inner">
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-success-500)] animate-ping shadow-[0_0_10px_var(--color-success-500)]" />
                    <span className="text-xs font-mono text-white/80 uppercase tracking-widest">System Operational</span>
                </div>
            </div>
        </footer>
    );
}
