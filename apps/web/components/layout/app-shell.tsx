"use client";
import { useState } from "react";
import { EnvironmentBanner } from "@/components/shared/environment-banner";
import { WorkspaceNavigation, WorkspaceBreadcrumbs } from "./workspace-navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  return <div className={`min-h-screen app-shell ${sidebarExpanded ? "" : "sidebar-collapsed"}`}>
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-white focus:p-4">Skip to content</a>
    <aside className="shell-sidebar flex flex-col gap-6 bg-sidebar p-6 text-sidebar-foreground">
      <WorkspaceNavigation desktopExpanded={sidebarExpanded} onDesktopExpandedChange={setSidebarExpanded} />
      <p className="sidebar-footer mt-auto hidden border-t border-white/15 pt-5 text-xs leading-relaxed text-slate-400 md:block">Synthetic records.<br />Evidence-backed investigation.</p>
    </aside>
    <div className="min-w-0">
      <header className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-6 py-5">
        <WorkspaceBreadcrumbs />
        <EnvironmentBanner />
      </header>
      <main tabIndex={-1} id="main" className="mx-auto max-w-[1600px] px-6 py-9 lg:px-8">{children}</main>
    </div>
  </div>;
}
