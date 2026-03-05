import type { Metadata } from "next";

export const metadata: Metadata = { title: "FAQs" };

export default function FAQsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
