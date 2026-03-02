"use client";

import { useState } from "react";
import { MobileHeader } from "./mobile-header";
import { DesktopTopNav } from "./desktop-top-nav";
import { BottomNav } from "./bottom-nav";
import { MoreMenu } from "./more-menu";
import { ExpiryBanner } from "./expiry-banner";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

interface DashboardShellProps {
  children: React.ReactNode;
  userName?: string;
  daysUntilExpiry?: number | null;
}

export function DashboardShell({ children, userName, daysUntilExpiry }: DashboardShellProps) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const hasBanner = daysUntilExpiry !== null && daysUntilExpiry !== undefined;

  return (
    <div className="bg-background text-foreground selection:bg-primary selection:text-primary-foreground flex min-h-dvh flex-col">
      {/* Noise texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Near-expiry banner — above all headers */}
      {hasBanner && <ExpiryBanner daysUntilExpiry={daysUntilExpiry} />}

      {/* Desktop top navbar */}
      <DesktopTopNav userName={userName} />

      {/* Mobile header */}
      <MobileHeader userName={userName} />

      {/* PWA install banner — inline between header and content */}
      <InstallPrompt />

      {/* Main content area */}
      <main
        aria-label="Main content"
        className="relative z-0 flex-1 overflow-x-hidden overflow-y-auto pb-[calc(var(--height-bottom-nav)+max(0.5rem,env(safe-area-inset-bottom))+0.75rem)] lg:pb-0"
      >
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <BottomNav onMoreClick={() => setMoreMenuOpen(true)} />

      {/* More menu bottom sheet */}
      <MoreMenu open={moreMenuOpen} onOpenChange={setMoreMenuOpen} />
    </div>
  );
}
