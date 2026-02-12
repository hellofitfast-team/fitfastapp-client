import { getTranslations } from "next-intl/server";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tBrand = await getTranslations("brand");

  return (
    <div className="min-h-screen bg-cream text-black selection:bg-black selection:text-cream">
      {/* Noise texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Top Banner */}
      <div className="bg-black text-cream py-2 px-4 overflow-hidden relative z-10">
        <div className="animate-marquee whitespace-nowrap font-mono text-xs tracking-widest">
          {`${tBrand("marquee")} • ${tBrand("marquee")} •`}
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b-4 border-black bg-cream">
        <div className="max-w-4xl mx-auto flex h-16 items-center justify-center px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center bg-black">
              <span className="text-xl font-black text-primary">FF</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-black">
              {tBrand("name").toUpperCase()}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-4xl p-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t-4 border-black bg-black text-cream py-6 mt-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="font-mono text-xs tracking-[0.3em]">
            &copy; {new Date().getFullYear()} {tBrand("name").toUpperCase()}™
          </p>
          <p className="font-mono text-xs tracking-[0.2em] text-primary">
            {tBrand("tagline").toUpperCase()}
          </p>
        </div>
      </footer>
    </div>
  );
}
