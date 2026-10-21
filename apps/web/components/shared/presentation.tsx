import type { ReactNode } from "react";
import { humanize } from "@/lib/formatters/text";
export { humanize } from "@/lib/formatters/text";
export function StatusBadge({ status }: { status: string }) {
  const tone = ["verified", "completed", "supported"].includes(status) ? "status-good"
    : ["failed", "rejected"].includes(status) ? "status-bad" : "status-pending";
  return <span className={`status-badge ${tone}`}>{humanize(status)}</span>;
}
export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="workspace-panel"><h2 className="panel-heading">{title}</h2><div className="p-5 space-y-4">{children}</div></section>;
}
export function Time({ value }: { value: string | null }) {
  return value ? <time dateTime={value} className="break-words font-mono text-xs">{value}</time> : <span>Not documented</span>;
}
