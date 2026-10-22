"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

const desktopQuery = "(min-width: 1024px)";
function subscribeViewport(notify: () => void) {
  if (!window.matchMedia) return () => undefined;
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}
const viewportSnapshot = () => window.matchMedia?.(desktopQuery).matches ?? false;
const serverViewport = () => false;

export function WorkspaceNavigation() {
  const pathname = usePathname() ?? "/";
  const desktop = useSyncExternalStore(subscribeViewport, viewportSnapshot, serverViewport);
  const [desktopExpanded, setDesktopExpanded] = useState(true);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const expanded = desktop ? desktopExpanded : mobileExpanded;
  const setExpanded = desktop ? setDesktopExpanded : setMobileExpanded;
  const area = pathname.startsWith("/patients") ? "Patient records" : pathname.startsWith("/investigations") ? "Investigations" : pathname.startsWith("/cases") ? "Case Library" : "Overview";
  return <>
    <button className="navigation-toggle" aria-expanded={expanded} aria-controls="workspace-navigation" onClick={() => setExpanded(value => !value)}>{expanded ? "Collapse navigation" : "Expand navigation"}</button>
    <nav id="workspace-navigation" aria-label="Main navigation" className={`workspace-navigation ${expanded ? "navigation-expanded" : ""}`}>
      <p className="mb-3 text-xs uppercase tracking-widest text-slate-400">Workspace · {area}</p>
      {[{ href: "/", label: "Overview" }, { href: "/patients", label: "Patient records" }, { href: "/cases", label: "Case Library" }].map(item => <Link key={item.href} href={item.href} aria-current={(item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) ? "page" : undefined} className="navigation-link" onClick={() => setExpanded(false)}>{item.label}</Link>)}
      <p className="mt-5 text-xs text-slate-400">Hospital records: select a patient.<br />Investigations: launch from a patient chart.</p>
      <p className="mt-4 text-xs text-slate-400">Browse cases to inspect imported record availability.</p>
    </nav>
  </>;
}
export function WorkspaceBreadcrumbs() {
  const pathname = usePathname() ?? "/";
  const area = pathname.startsWith("/patients") ? "Patient records" : pathname.startsWith("/investigations") ? "Investigation workspace" : pathname.startsWith("/cases") ? "Case Library" : "Overview";
  return <nav aria-label="Workspace breadcrumb" className="text-sm text-muted-foreground"><Link href="/">Hospital overview</Link>{pathname !== "/" && <> / <span>{area}{pathname.endsWith("/report") ? " / Report" : ""}</span></>}</nav>;
}
