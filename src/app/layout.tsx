import type { Metadata, Viewport } from "next";
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
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FitFast",
  },
  formatDetection: {
    telephone: false,
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
  themeColor: "#4169E1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
