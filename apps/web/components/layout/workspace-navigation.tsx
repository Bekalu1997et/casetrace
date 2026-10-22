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

const NAV_ITEMS = [
  { href: "/", label: "Overview", group: "top" },
  { href: "/cases", label: "Case Library", group: "clinical" },
  { href: "/patients", label: "Patient records", group: "clinical" },
  { href: "/investigations", label: "Investigations", group: "investigation" },
];

function isActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function WorkspaceNavigation() {
  const pathname = usePathname() ?? "/";
  const desktop = useSyncExternalStore(subscribeViewport, viewportSnapshot, serverViewport);
  const [desktopExpanded, setDesktopExpanded] = useState(true);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const expanded = desktop ? desktopExpanded : mobileExpanded;
  const setExpanded = desktop ? setDesktopExpanded : setMobileExpanded;

  return (
    <>
      <button
        className="navigation-toggle"
        aria-expanded={expanded}
        aria-controls="workspace-navigation"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "Collapse navigation" : "Expand navigation"}
      </button>
      <nav
        id="workspace-navigation"
        aria-label="Main navigation"
        className={`workspace-navigation ${expanded ? "navigation-expanded" : ""}`}
      >
        {NAV_ITEMS.filter((i) => i.group === "top").map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href, pathname) ? "page" : undefined}
            className="navigation-link"
            onClick={() => setExpanded(false)}
          >
            {item.label}
          </Link>
        ))}

        <p className="nav-section-label">Clinical Workspace</p>
        {NAV_ITEMS.filter((i) => i.group === "clinical").map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href, pathname) ? "page" : undefined}
            className="navigation-link"
            onClick={() => setExpanded(false)}
          >
            {item.label}
          </Link>
        ))}

        <p className="nav-section-label">Investigation</p>
        {NAV_ITEMS.filter((i) => i.group === "investigation").map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href, pathname) ? "page" : undefined}
            className="navigation-link"
            onClick={() => setExpanded(false)}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

// ─── Breadcrumb builder ────────────────────────────────────────────────────────

interface Crumb {
  label: string;
  href?: string;
}

function buildCrumbs(pathname: string): Crumb[] {
  const crumbs: Crumb[] = [{ label: "Hospital overview", href: "/" }];
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return [{ label: "Hospital overview" }];

  const SECTION_LABELS: Record<string, string> = {
    patients: "Patients",
    cases: "Cases",
    investigations: "Investigations",
    encounters: "Encounters",
    documents: "Documents",
    labs: "Laboratory",
    medications: "Medications",
    imaging: "Imaging",
    timeline: "Timeline",
    evidence: "Evidence",
    report: "Report",
    new: "New Investigation",
    source: "Source",
  };

  let path = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    path += `/${seg}`;
    const isLast = i === segments.length - 1;
    const label = SECTION_LABELS[seg] ?? decodeURIComponent(seg);
    crumbs.push(isLast ? { label } : { label, href: path });
  }

  return crumbs;
}

export function WorkspaceBreadcrumbs() {
  const pathname = usePathname() ?? "/";
  const crumbs = buildCrumbs(pathname);

  return (
    <nav aria-label="Workspace breadcrumb" className="text-sm text-muted-foreground flex flex-wrap items-center gap-1">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden="true" className="text-border select-none">/</span>}
            {crumb.href && !isLast ? (
              <Link href={crumb.href} className="hover:text-foreground transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current={isLast ? "page" : undefined} className={isLast ? "text-foreground font-medium" : ""}>
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
