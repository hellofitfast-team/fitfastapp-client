import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/auth/LocaleSwitcher";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tBrand = await getTranslations("brand");

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFEF5] text-black selection:bg-black selection:text-[#FFFEF5]">
      {/* Noise texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Top Banner */}
      <div className="bg-black text-[#FFFEF5] py-2 px-4 overflow-hidden relative z-10">
        <div className="animate-marquee whitespace-nowrap font-mono text-xs tracking-widest">
          {`${tBrand("marquee")} • ${tBrand("marquee")} •`}
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b-4 border-black bg-[#FFFEF5]">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center bg-black">
              <span className="text-xl font-black text-[#00FF94]">FF</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-black">
              {tBrand("name").toUpperCase()}
            </h1>
          </div>
          <LocaleSwitcher />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t-4 border-black bg-black text-[#FFFEF5] py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="font-mono text-xs tracking-[0.3em]">
            &copy; {new Date().getFullYear()} {tBrand("name").toUpperCase()}™ • {tBrand("copyright").toUpperCase()}
          </p>
          <p className="font-mono text-xs tracking-[0.2em] text-[#00FF94]">
            {tBrand("tagline").toUpperCase()}
          </p>
        </div>
      </footer>
    </div>
  );
}
