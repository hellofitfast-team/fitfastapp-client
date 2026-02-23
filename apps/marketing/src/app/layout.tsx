import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, Alexandria } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const alexandria = Alexandria({
  subsets: ["arabic", "latin"],
  variable: "--font-alexandria",
});

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
  icons: {
    icon: [{ url: "/favicon.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
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
  themeColor: "#FF4500",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable} ${alexandria.variable}`}>
      <body className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] antialiased font-sans">
        <svg className="noise-overlay" xmlns="http://www.w3.org/2000/svg">
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>
        {children}
      </body>
    </html>
  );
}
