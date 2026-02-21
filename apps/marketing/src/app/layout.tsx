import type { Metadata, Viewport } from "next";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
