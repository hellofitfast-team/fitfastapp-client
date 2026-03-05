import type { Metadata } from "next";

export const metadata: Metadata = { title: "Signups" };

export default function SignupsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
