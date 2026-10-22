import type { ReactNode } from "react";
import { humanize } from "@/lib/formatters/text";
export { humanize } from "@/lib/formatters/text";

const STATUS_TONES: Record<string, string> = {
  running: "status-active",
  active: "status-active",
  verified: "status-good",
  completed: "status-good",
  supported: "status-good",
  failed: "status-bad",
  rejected: "status-bad",
  queued: "status-neutral",
  cancelled: "status-neutral",
  skipped: "status-neutral",
  unknown: "status-neutral",
  proposed: "status-proposed",
  candidate: "status-proposed",
  unresolved: "status-pending",
  completed_with_limitations: "status-pending",
  partial: "status-pending",
  inconclusive: "status-pending",
  under_review: "status-pending",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONES[status] ?? "status-neutral";
  return <span className={`status-badge ${tone}`}>{humanize(status)}</span>;
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="workspace-panel">
      <h2 className="panel-heading">{title}</h2>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );
}

const UTC_FMT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
  timeZoneName: "short",
});

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatTimestamp(value: string): string {
  // Date-only: YYYY-MM-DD — preserve as date without inventing time
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    try {
      return DATE_FMT.format(new Date(`${value}T00:00:00Z`));
    } catch {
      return value;
    }
  }
  // Full instant with timezone
  try {
    const ms = Date.parse(value);
    if (!Number.isFinite(ms)) return value;
    return UTC_FMT.format(new Date(ms));
  } catch {
    return value;
  }
}

export function Time({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground text-xs">Not documented</span>;
  const display = formatTimestamp(value);
  return (
    <time dateTime={value} className="text-tabular text-xs">
      {display}
    </time>
  );
}
