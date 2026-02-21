"use client";

import { useState } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";

interface AdminShellProps {
  children: React.ReactNode;
  coachName?: string;
  pendingSignups?: number;
  openTickets?: number;
}

export function AdminShell({
  children,
  coachName,
  pendingSignups,
  openTickets,
}: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-stone-50 text-stone-900" style={{ fontFamily: "var(--font-outfit)" }}>
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingSignups={pendingSignups}
        openTickets={openTickets}
      />

      <div className="flex flex-1 flex-col">
        <AdminHeader
          onMenuClick={() => setSidebarOpen(true)}
          coachName={coachName}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
