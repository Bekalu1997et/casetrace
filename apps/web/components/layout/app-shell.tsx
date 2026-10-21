import { EnvironmentBanner } from "@/components/shared/environment-banner";
import { WorkspaceNavigation, WorkspaceBreadcrumbs } from "./workspace-navigation";
import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen app-shell">
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-white focus:p-4">Skip to content</a>
    <aside className="shell-sidebar flex flex-col gap-6 bg-sidebar p-6 text-sidebar-foreground">
      <Link href="/" className="flex items-center gap-3" aria-label="CASETRACE home">
        <span className="grid size-9 place-items-center rounded-lg bg-teal text-lg font-bold text-white" aria-hidden="true">C</span>
        <span><strong className="text-sm tracking-wider">CASETRACE</strong><span className="block text-[10px] tracking-widest text-slate-400">CLINICAL INVESTIGATION</span></span>
      </Link>
      <WorkspaceNavigation />
      <p className="mt-auto hidden border-t border-white/15 pt-5 text-xs leading-relaxed text-slate-400 md:block">Synthetic records.<br />Evidence-backed investigation.</p>
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
