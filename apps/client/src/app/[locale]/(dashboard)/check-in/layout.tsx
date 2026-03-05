import type { Metadata } from "next";

export const metadata: Metadata = { title: "Check-in" };

export default function CheckInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
