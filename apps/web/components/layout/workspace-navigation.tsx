"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { PanelLeftClose, PanelLeftOpen, LayoutDashboard, Users, FolderOpen, ScanSearch } from "lucide-react";

const desktopQuery = "(min-width: 1024px)";
function subscribeViewport(notify: () => void) {
  if (!window.matchMedia) return () => undefined;
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}
const viewportSnapshot = () => window.matchMedia?.(desktopQuery).matches ?? false;
const serverViewport = () => false;

export function WorkspaceNavigation({ desktopExpanded = true, onDesktopExpandedChange }: { desktopExpanded?: boolean; onDesktopExpandedChange?: (expanded: boolean) => void }) {
  const pathname = usePathname() ?? "/";
  const desktop = useSyncExternalStore(subscribeViewport, viewportSnapshot, serverViewport);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const expanded = desktop ? desktopExpanded : mobileExpanded;
  const toggle = () => desktop ? onDesktopExpandedChange?.(!desktopExpanded) : setMobileExpanded(value => !value);
  const area = pathname.startsWith("/patients") ? "Patient records" : pathname.startsWith("/investigations") ? "Investigations" : pathname.startsWith("/cases") ? "Case Library" : "Overview";
  return <>
    <div className="sidebar-header">
      <Link href="/" className="sidebar-brand" aria-label="CASETRACE home"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal text-lg font-bold text-white" aria-hidden="true">C</span><span className="sidebar-brand-text"><strong className="text-sm tracking-wider">CASETRACE</strong><span className="block text-[10px] tracking-widest text-slate-400">CLINICAL INVESTIGATION</span></span></Link>
      <button type="button" className="navigation-toggle" aria-expanded={expanded} aria-controls="workspace-navigation" aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"} title={expanded ? "Collapse sidebar" : "Expand sidebar"} onClick={toggle}>{expanded ? <PanelLeftClose size={18} aria-hidden="true" /> : <PanelLeftOpen size={18} aria-hidden="true" />}</button>
    </div>
    <nav id="workspace-navigation" aria-label="Main navigation" className={`workspace-navigation ${expanded ? "navigation-expanded" : ""}`}>
      <p className="navigation-description mb-3 text-xs uppercase tracking-widest text-slate-400">Workspace · {area}</p>
      {[{ href: "/", label: "Overview", icon: LayoutDashboard }, { href: "/patients", label: "Patient records", icon: Users }, { href: "/cases", label: "Case Library", icon: FolderOpen }, { href: "/investigations", label: "Investigations", icon: ScanSearch }].map(item => <Link key={item.href} href={item.href} aria-label={item.label} title={item.label} aria-current={(item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) ? "page" : undefined} className="navigation-link" onClick={() => setMobileExpanded(false)}><item.icon size={20} aria-hidden="true" /><span className="navigation-label">{item.label}</span></Link>)}
      <p className="navigation-description mt-5 text-xs text-slate-400">Hospital records: select a patient.<br />Investigations: launch from a patient chart.</p>
      <p className="navigation-description mt-4 text-xs text-slate-400">Browse cases to inspect imported record availability.</p>
    </nav>
  </>;
}
export function WorkspaceBreadcrumbs() {
  const pathname = usePathname() ?? "/";
  const area = pathname.startsWith("/patients") ? "Patient records" : pathname.startsWith("/investigations") ? "Investigation workspace" : pathname.startsWith("/cases") ? "Case Library" : "Overview";
  return <nav aria-label="Workspace breadcrumb" className="text-sm text-muted-foreground"><Link href="/">Hospital overview</Link>{pathname !== "/" && <> / <span>{area}{pathname.endsWith("/report") ? " / Report" : ""}</span></>}</nav>;
}
