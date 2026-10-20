import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen md:grid md:grid-cols-[232px_minmax(0,1fr)]">
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-white focus:p-4">Skip to content</a>
    <aside className="flex flex-col gap-9 bg-sidebar p-6 text-sidebar-foreground">
      <Link href="/" className="flex items-center gap-3" aria-label="CASETRACE home">
        <span className="grid size-9 place-items-center rounded-lg bg-teal text-lg font-bold text-white" aria-hidden="true">C</span>
        <span><strong className="text-sm tracking-wider">CASETRACE</strong><span className="block text-[10px] tracking-widest text-slate-400">CLINICAL INVESTIGATION</span></span>
      </Link>
      <nav aria-label="Main navigation"><p className="mb-3 text-xs uppercase tracking-widest text-slate-400">Workspace</p>
        <Link href="/" className="block rounded-md bg-white/10 px-3 py-2.5 text-sm">Overview</Link>
        <Link href="/patients" className="mt-2 block rounded-md px-3 py-2.5 text-sm hover:bg-white/10">Patient records</Link></nav>
      <p className="mt-auto hidden border-t border-white/15 pt-5 text-xs leading-relaxed text-slate-400 md:block">Synthetic records.<br />Evidence-backed investigation.</p>
    </aside>
    <div className="min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-6 py-5">
        <span className="text-sm text-muted-foreground">Workspace / Overview</span>
        <span className="rounded-full border border-teal/20 bg-accent px-3 py-1.5 text-[10px] font-semibold tracking-wide text-teal">SYNTHETIC DEMO — NOT FOR CLINICAL USE</span>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-6 py-9 lg:px-10">{children}</main>
    </div>
  </div>;
}
