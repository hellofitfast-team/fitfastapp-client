import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/auth/LocaleSwitcher";
import Image from "next/image";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tBrand = await getTranslations("brand");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Image
              src="/icons/icon-512x512.png"
              alt="FitFast"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <h1 className="text-lg font-bold tracking-tight">
              {tBrand("name")}
            </h1>
          </div>
          <LocaleSwitcher />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-4">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-center md:text-start">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {tBrand("name")} — {tBrand("copyright")}
          </p>
          <p className="text-xs text-muted-foreground">
            {tBrand("tagline")}
          </p>
        </div>
      </footer>
    </div>
  );
}
