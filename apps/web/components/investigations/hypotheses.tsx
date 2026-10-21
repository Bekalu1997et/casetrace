import type { Anchor, Hypothesis } from "@/types/investigation";
import { StatusBadge } from "./presentation";
export function Hypotheses({ items, onOpen }: { items: Hypothesis[]; onOpen: (anchor: Anchor) => void }) {
  return <div className="grid gap-4 lg:grid-cols-2">{!items.length && <p>No structured hypotheses are available yet.</p>}{items.map((item, index) => <article className="rounded-lg border border-border bg-card p-5 space-y-3" key={index}>
    <StatusBadge status={item.verdict} /><h3 className="font-semibold">{item.explanation}</h3>
    <p className="text-xs text-muted-foreground">Investigation explanation; this is not a confirmed diagnosis or a diagnostic probability.</p>
    {([['Supporting evidence', item.supports], ['Opposing evidence', item.weakens]] as const).map(([label, anchors]) => <div key={label}><h4 className="text-sm font-medium">{label}</h4>{!anchors.length && <p className="text-sm text-muted-foreground">None documented</p>}{anchors.map((anchor, i) => <button className="source-link mr-2 mt-2" key={i} onClick={() => onOpen(anchor)}>{anchor.source.id}</button>)}</div>)}
    <h4 className="text-sm font-medium">Missing information</h4>{item.missing_evidence.length ? item.missing_evidence.map((text, i) => <p className="text-sm" key={i}>{text}</p>) : <p className="text-sm text-muted-foreground">No additional missing information listed.</p>}
  </article>)}</div>;
}
