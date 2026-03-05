import type { Metadata } from "next";

export const metadata: Metadata = { title: "Workout Plan" };

export default function WorkoutPlanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
