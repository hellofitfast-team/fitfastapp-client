"use client";

import { useState } from "react";
import { MobileHeader } from "./mobile-header";
import { DesktopTopNav } from "./desktop-top-nav";
import { BottomNav } from "./bottom-nav";
import { MoreMenu } from "./more-menu";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OneSignalIdentity } from "@/components/pwa/OneSignalIdentity";

interface DashboardShellProps {
  children: React.ReactNode;
  userName?: string;
}

export function DashboardShell({ children, userName }: DashboardShellProps) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-cream text-black selection:bg-black selection:text-cream">
      {/* Noise texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Desktop top navbar */}
      <DesktopTopNav userName={userName} />

      {/* Mobile header */}
      <MobileHeader userName={userName} />

      {/* Main content area */}
      <main className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden pb-[calc(var(--height-bottom-nav)+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <BottomNav onMoreClick={() => setMoreMenuOpen(true)} />

      {/* More menu bottom sheet */}
      <MoreMenu open={moreMenuOpen} onOpenChange={setMoreMenuOpen} />

      {/* PWA components */}
      <InstallPrompt />
      <OneSignalIdentity />
    </div>
  );
}
