import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@fitfast/i18n/routing";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { OneSignalProvider } from "@/components/pwa/OneSignalProvider";
import { ConvexClientProvider } from "@/components/providers/convex-provider";

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

  return (
    <ConvexClientProvider>
      <NextIntlClientProvider messages={messages}>
        <ServiceWorkerRegistration />
        <OneSignalProvider />
        {children}
      </NextIntlClientProvider>
    </ConvexClientProvider>
  );
}
