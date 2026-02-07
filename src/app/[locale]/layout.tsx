import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { OneSignalProvider } from "@/components/pwa/OneSignalProvider";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate that the incoming locale is valid
  if (!routing.locales.includes(locale as "en" | "ar")) {
    notFound();
  }

  // Get messages for the current locale
  const messages = await getMessages();

  // Determine text direction
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir}>
      <head>
        {/* Cairo font for Arabic typography - loaded via link to avoid CSS @import issues with Tailwind v4 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@500;600;700;900&family=Outfit:wght@500;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <NextIntlClientProvider messages={messages}>
          <ServiceWorkerRegistration />
          <OneSignalProvider />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
