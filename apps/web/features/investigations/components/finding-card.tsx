"use client";
import Link from "next/link";
import { hospitalSourceHref } from "@/features/records/navigation";
import type { Anchor, Finding } from "@/types/investigation";
import { StatusBadge, humanize } from "@/components/shared/presentation";
import { Button } from "@/components/ui/button";
export function FindingCard({ finding, onOpen, onCompare, onAsk, patientId }: {
  finding: Finding; patientId?: string; onAsk?: (finding: Finding) => void; onOpen: (anchor: Anchor) => void; onCompare?: (finding: Finding) => void;
}) {
  return <article className={`finding-card finding-${finding.status}`}>
    <div className="flex flex-wrap gap-2"><StatusBadge status={finding.status} /><span className="text-xs text-muted-foreground">{humanize(finding.claim_kind)} · {finding.support_level} evidence</span></div>
    <h3 className="mt-3 font-semibold">{finding.title}</h3><p className="mt-2 text-sm leading-6">{finding.claim}</p>
    <p className="mt-2 text-xs text-muted-foreground">Verification: {humanize(finding.verification.classification)}</p>
    <Link className="source-link mt-3 no-print" href={`/investigations/${encodeURIComponent(finding.investigation_id)}/evidence?finding=${encodeURIComponent(finding.id)}`}>Inspect finding evidence</Link>
    <div className="mt-3 flex flex-wrap gap-2">{finding.anchors.map((anchor, index) => <button className="source-link" key={`${anchor.source.id}:${anchor.field}:${index}`} onClick={() => onOpen(anchor)}>{anchor.source.id} · {anchor.relationship}</button>)}</div>
    {patientId && <div className="mt-3 flex flex-wrap gap-2">{[...new Map(finding.anchors.map(anchor => [anchor.source.id,anchor])).values()].map(anchor => <Link className="source-link" key={anchor.source.id} href={hospitalSourceHref(patientId,anchor.source,finding.investigation_id,finding.id)}>Hospital source {anchor.source.id}</Link>)}</div>}
    {onCompare && finding.anchors.length > 1 && <Button variant="outline" className="mt-3" onClick={() => onCompare(finding)}>Compare source records</Button>}
    {onAsk && <Button variant="outline" className="mt-3 ml-2" onClick={() => onAsk(finding)}>Ask about finding</Button>}
    <details className="mt-4 text-sm"><summary>Verification checks & uncertainty</summary>
      <ul className="mt-3 space-y-2">{finding.verification.checks.map((check, index) => <li key={index}>{humanize(check.type)} · {check.status}: {check.message}</li>)}</ul>
      {finding.alternatives.map((text, index) => <p className="mt-2" key={`a${index}`}>Alternative: {text}</p>)}
      {finding.limitations.map((text, index) => <p className="mt-2" key={`l${index}`}>Limitation: {text}</p>)}
    </details>
  </article>;
}
