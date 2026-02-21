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
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0">
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
