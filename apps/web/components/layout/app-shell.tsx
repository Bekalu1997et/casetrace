import { EnvironmentBanner } from "@/components/shared/environment-banner";
import { WorkspaceNavigation, WorkspaceBreadcrumbs } from "./workspace-navigation";
import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen app-shell">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-white focus:p-4 focus:rounded focus:shadow-lg"
      >
        Skip to content
      </a>
      <aside className="shell-sidebar flex flex-col bg-sidebar text-sidebar-foreground" style={{ padding: "20px 16px" }}>
        <Link
          href="/"
          className="flex items-center gap-3 mb-6 px-2"
          aria-label="CASETRACE home"
        >
          <span
            className="grid place-items-center rounded-lg bg-teal font-bold text-white flex-shrink-0"
            style={{ width: 34, height: 34, fontSize: 15 }}
            aria-hidden="true"
          >
            C
          </span>
          <span>
            <strong className="block text-sm tracking-wider text-white">CASETRACE</strong>
            <span className="block text-[10px] tracking-widest" style={{ color: "rgba(219,229,245,0.5)" }}>
              CLINICAL INVESTIGATION
            </span>
          </span>
        </Link>

        <WorkspaceNavigation />

        <div
          className="mt-auto hidden md:block border-t pt-5 text-xs leading-relaxed"
          style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(219,229,245,0.4)" }}
        >
          Synthetic records.<br />
          Evidence-backed investigation.
        </div>
      </aside>

      <div className="min-w-0 flex flex-col">
        <header className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-6 py-4">
          <WorkspaceBreadcrumbs />
          <EnvironmentBanner />
        </header>
        <main
          tabIndex={-1}
          id="main"
          className="mx-auto w-full max-w-[1600px] px-6 py-8 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
