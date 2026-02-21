import { getTranslations } from "next-intl/server";
import Image from "next/image";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tBrand = await getTranslations("brand");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto flex h-14 items-center justify-center px-6">
          <div className="flex items-center gap-3">
            <Image
              src="/icons/icon-512x512.png"
              alt="FitFast"
              width={32}
              height={32}
              className="h-8 w-8 rounded"
            />
            <h1 className="text-lg font-bold tracking-tight">
              {tBrand("name")}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl p-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6 mt-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {tBrand("name")}
          </p>
          <p className="text-xs text-muted-foreground">
            {tBrand("tagline")}
          </p>
        </div>
      </footer>
    </div>
  );
}
