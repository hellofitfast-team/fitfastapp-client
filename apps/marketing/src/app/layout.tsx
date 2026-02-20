import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FitFast - AI-Powered Fitness Coaching",
    template: "%s | FitFast",
  },
  description:
    "Personalized meal plans and workout routines powered by AI. Track your progress and achieve your fitness goals.",
  keywords: [
    "fitness",
    "coaching",
    "meal plan",
    "workout",
    "AI",
    "health",
    "Egypt",
    "MENA",
  ],
  authors: [{ name: "FitFast" }],
  creator: "FitFast",
  openGraph: {
    type: "website",
    siteName: "FitFast",
    title: "FitFast - AI-Powered Fitness Coaching",
    description:
      "Personalized meal plans and workout routines powered by AI. Track your progress and achieve your fitness goals.",
  },
  twitter: {
    card: "summary",
    title: "FitFast - AI-Powered Fitness Coaching",
    description:
      "Personalized meal plans and workout routines powered by AI. Track your progress and achieve your fitness goals.",
  },
};

export const viewport: Viewport = {
  themeColor: "#4169E1",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const locale = h.get("x-next-intl-locale") ?? "en";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@500;600;700;900&family=Outfit:wght@500;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
