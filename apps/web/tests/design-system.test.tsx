import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatusBadge, Time } from "@/components/shared/presentation";
import { LoadingState, EmptyState, ErrorState, WarningNotice, InfoNotice } from "@/components/shared/resource-state";
import { SkeletonLoader } from "@/components/shared/skeleton-loader";
import { PrecisionIndicator } from "@/components/shared/precision-indicator";
import { WorkspaceBreadcrumbs } from "@/components/layout/workspace-navigation";

vi.mock("next/navigation", () => ({ usePathname: () => "/patients/SYN-001/documents/DOC-021" }));

// ─── StatusBadge ──────────────────────────────────────────────────────────────

describe("StatusBadge", () => {
  it("renders running with active (teal) tone", () => {
    render(<StatusBadge status="running" />);
    const badge = screen.getByText("running");
    expect(badge).toHaveClass("status-active");
    expect(badge).toBeVisible();
  });

  it("renders queued with neutral tone", () => {
    render(<StatusBadge status="queued" />);
    expect(screen.getByText("queued")).toHaveClass("status-neutral");
  });

  it("renders completed with good (green) tone", () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText("completed")).toHaveClass("status-good");
  });

  it("renders verified with good tone", () => {
    render(<StatusBadge status="verified" />);
    expect(screen.getByText("verified")).toHaveClass("status-good");
  });

  it("renders proposed with proposed (blue) tone", () => {
    render(<StatusBadge status="proposed" />);
    expect(screen.getByText("proposed")).toHaveClass("status-proposed");
  });

  it("renders unresolved with pending (amber) tone", () => {
    render(<StatusBadge status="unresolved" />);
    expect(screen.getByText("unresolved")).toHaveClass("status-pending");
  });

  it("renders failed with bad (red) tone", () => {
    render(<StatusBadge status="failed" />);
    expect(screen.getByText("failed")).toHaveClass("status-bad");
  });

  it("renders rejected with bad tone", () => {
    render(<StatusBadge status="rejected" />);
    expect(screen.getByText("rejected")).toHaveClass("status-bad");
  });

  it("renders cancelled with neutral tone", () => {
    render(<StatusBadge status="cancelled" />);
    expect(screen.getByText("cancelled")).toHaveClass("status-neutral");
  });

  it("renders completed_with_limitations with pending tone and humanized text", () => {
    render(<StatusBadge status="completed_with_limitations" />);
    const badge = screen.getByText("completed with limitations");
    expect(badge).toHaveClass("status-pending");
  });

  it("renders unknown statuses safely with neutral fallback", () => {
    render(<StatusBadge status="future_unknown_status" />);
    const badge = screen.getByText("future unknown status");
    expect(badge).toHaveClass("status-neutral");
    expect(badge).toBeVisible();
  });
});

// ─── Time ─────────────────────────────────────────────────────────────────────

describe("Time", () => {
  it("formats a UTC timestamp as human-readable", () => {
    render(<Time value="2026-10-19T14:32:00Z" />);
    const el = document.querySelector("time");
    expect(el).toHaveAttribute("datetime", "2026-10-19T14:32:00Z");
    // Should not render raw ISO string
    expect(el?.textContent).not.toBe("2026-10-19T14:32:00Z");
    // Should contain year and month
    expect(el?.textContent).toContain("2026");
    expect(el?.textContent).toContain("Oct");
  });

  it("preserves date-only value without inventing time", () => {
    render(<Time value="2026-01-01" />);
    const el = document.querySelector("time");
    expect(el).toHaveAttribute("datetime", "2026-01-01");
    // Must not contain a time component
    expect(el?.textContent).not.toMatch(/\d{2}:\d{2}/);
    expect(el?.textContent).toContain("2026");
  });

  it("handles a timestamp with timezone offset", () => {
    render(<Time value="2026-10-19T09:00:00+03:00" />);
    const el = document.querySelector("time");
    expect(el).toHaveAttribute("datetime", "2026-10-19T09:00:00+03:00");
    expect(el?.textContent).toContain("2026");
  });

  it("renders null value as not-documented text", () => {
    render(<Time value={null} />);
    expect(screen.getByText("Not documented")).toBeVisible();
    expect(document.querySelector("time")).toBeNull();
  });

  it("handles invalid value gracefully without throwing", () => {
    expect(() => render(<Time value="not-a-date" />)).not.toThrow();
  });

  it("produces consistent output for the same UTC instant", () => {
    const { container: a } = render(<Time value="2026-06-15T10:00:00Z" />);
    const { container: b } = render(<Time value="2026-06-15T10:00:00Z" />);
    expect(a.querySelector("time")?.textContent).toBe(b.querySelector("time")?.textContent);
  });
});

// ─── Breadcrumbs ──────────────────────────────────────────────────────────────

describe("WorkspaceBreadcrumbs", () => {
  it("renders full path for deep nested route", () => {
    render(<WorkspaceBreadcrumbs />);
    expect(screen.getByText("Hospital overview")).toBeInTheDocument();
    expect(screen.getByText("Patients")).toBeInTheDocument();
    expect(screen.getByText("SYN-001")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("DOC-021")).toBeInTheDocument();
  });

  it("marks the last segment as current page", () => {
    render(<WorkspaceBreadcrumbs />);
    expect(screen.getByText("DOC-021")).toHaveAttribute("aria-current", "page");
  });

  it("has accessible nav landmark", () => {
    render(<WorkspaceBreadcrumbs />);
    expect(screen.getByRole("navigation", { name: "Workspace breadcrumb" })).toBeInTheDocument();
  });
});

// ─── Skeleton loader ──────────────────────────────────────────────────────────

describe("SkeletonLoader", () => {
  it("renders card variant with accessible role", () => {
    render(<SkeletonLoader variant="card" />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("renders metric variant", () => {
    render(<SkeletonLoader variant="metric" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders table variant with configurable rows", () => {
    render(<SkeletonLoader variant="table" rows={3} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders finding variant", () => {
    render(<SkeletonLoader variant="finding" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders content variant", () => {
    render(<SkeletonLoader variant="content" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("includes sr-only loading text for screen readers", () => {
    render(<SkeletonLoader variant="card" />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
});

// ─── Resource states ──────────────────────────────────────────────────────────

describe("Resource states", () => {
  it("LoadingState has status role", () => {
    render(<LoadingState>Loading records…</LoadingState>);
    expect(screen.getByRole("status")).toHaveTextContent("Loading records…");
  });

  it("EmptyState renders text", () => {
    render(<EmptyState>No records found</EmptyState>);
    expect(screen.getByText("No records found")).toBeVisible();
  });

  it("ErrorState has alert role and retry button", () => {
    const retry = vi.fn();
    render(<ErrorState onRetry={retry}>Network error</ErrorState>);
    expect(screen.getByRole("alert")).toHaveTextContent("Network error");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("ErrorState renders without retry when no handler provided", () => {
    render(<ErrorState>Read-only error</ErrorState>);
    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("WarningNotice renders with notice class", () => {
    const { container } = render(<WarningNotice>Warning text</WarningNotice>);
    expect(container.firstChild).toHaveClass("notice");
  });

  it("InfoNotice renders with info class", () => {
    const { container } = render(<InfoNotice>Info text</InfoNotice>);
    expect(container.firstChild).toHaveClass("notice-info");
  });

  it("ErrorState and EmptyState are visually distinguishable", () => {
    const { container: errContainer } = render(<ErrorState>Error</ErrorState>);
    const { container: emptyContainer } = render(<EmptyState>Empty</EmptyState>);
    const errClass = (errContainer.firstChild as HTMLElement)?.className ?? "";
    const emptyClass = (emptyContainer.firstChild as HTMLElement)?.className ?? "";
    expect(errClass).not.toBe(emptyClass);
  });
});

// ─── PrecisionIndicator ───────────────────────────────────────────────────────

describe("PrecisionIndicator", () => {
  it("renders instant precision", () => {
    render(<PrecisionIndicator precision="instant" />);
    expect(screen.getByRole("img", { name: "Precise timestamp" })).toBeInTheDocument();
  });

  it("renders day precision", () => {
    render(<PrecisionIndicator precision="day" />);
    expect(screen.getByRole("img", { name: "Date only" })).toBeInTheDocument();
  });

  it("renders unknown precision", () => {
    render(<PrecisionIndicator precision="unknown" />);
    expect(screen.getByRole("img", { name: "Unknown precision" })).toBeInTheDocument();
  });
});
