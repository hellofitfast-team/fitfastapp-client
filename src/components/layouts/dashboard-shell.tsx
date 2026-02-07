"use client";

import { useState } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OneSignalIdentity } from "@/components/pwa/OneSignalIdentity";

interface DashboardShellProps {
  children: React.ReactNode;
  userName?: string;
}

export function DashboardShell({ children, userName }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#FFFEF5] text-black selection:bg-black selection:text-[#FFFEF5]">
      {/* Noise texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0 relative z-10">
        {/* Header */}
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          userName={userName}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* PWA install prompt */}
      <InstallPrompt />

      {/* OneSignal identity linking */}
      <OneSignalIdentity />
    </div>
  );
}
