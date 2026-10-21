"use client";
import type { Anchor, Finding } from "@/types/investigation";
import { StatusBadge, humanize } from "@/components/investigations/presentation";
import { Button } from "@/components/ui/button";
export function FindingCard({ finding, onOpen, onCompare }: {
  finding: Finding; onOpen: (anchor: Anchor) => void; onCompare?: (finding: Finding) => void;
}) {
  return <article className={`finding-card ${finding.status === "verified" ? "finding-verified" : "finding-candidate"}`}>
    <div className="flex flex-wrap gap-2"><StatusBadge status={finding.status} /><span className="text-xs text-muted-foreground">{humanize(finding.claim_kind)} · {finding.support_level} evidence</span></div>
    <h3 className="mt-3 font-semibold">{finding.title}</h3><p className="mt-2 text-sm leading-6">{finding.claim}</p>
    <p className="mt-2 text-xs text-muted-foreground">Verification: {humanize(finding.verification.classification)}</p>
    <div className="mt-3 flex flex-wrap gap-2">{finding.anchors.map((anchor, index) => <button className="source-link" key={`${anchor.source.id}:${anchor.field}:${index}`} onClick={() => onOpen(anchor)}>{anchor.source.id} · {anchor.relationship}</button>)}</div>
    {onCompare && finding.anchors.length > 1 && <Button variant="outline" className="mt-3" onClick={() => onCompare(finding)}>Compare source records</Button>}
    <details className="mt-4 text-sm"><summary>Verification checks & uncertainty</summary>
      <ul className="mt-3 space-y-2">{finding.verification.checks.map((check, index) => <li key={index}>{humanize(check.type)} · {check.status}: {check.message}</li>)}</ul>
      {finding.alternatives.map((text, index) => <p className="mt-2" key={`a${index}`}>Alternative: {text}</p>)}
      {finding.limitations.map((text, index) => <p className="mt-2" key={`l${index}`}>Limitation: {text}</p>)}
    </details>
  </article>;
}
