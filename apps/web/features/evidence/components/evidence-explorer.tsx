"use client";
import Link from "next/link";
import { useState } from "react";
import { useInvestigation } from "@/features/investigations/hooks/use-investigation";
import { useEvidenceSelection } from "../hooks/use-evidence-selection";
import { SourcePanel } from "./source-panel";
import { comparisonSources } from "../navigation";
import { FindingCard } from "@/features/investigations/components/finding-card";
import { StatusBadge, Panel } from "@/components/shared/presentation";
import { Button } from "@/components/ui/button";
import type { SourceRef } from "@/types/investigation";

export function EvidenceExplorer({ id, initialFinding, initialSource }: { id: string; initialFinding?: string; initialSource?: SourceRef }) {
  const { state, findings, error, retry } = useInvestigation(id);
  const [findingId, setFindingId] = useState(initialFinding);
  const [selection, select] = useEvidenceSelection(initialSource);
  const [relationship, setRelationship] = useState("all");
  const finding = findings.find(item => item.id === findingId);
  // Rehydrate anchors from persisted membership, never from URL content.
  const sources = selection.map(item => ({ ...item, anchors: finding?.anchors.filter(anchor => anchor.source.id === item.source.id && anchor.source.type === item.source.type) }));
  const invalid = Boolean(findingId && !finding) || finding && sources.some(item => !item.anchors?.length);
  function chooseFinding(value: string) {
    setFindingId(value); select([]); setRelationship("all");
    const url = new URL(window.location.href); url.searchParams.set("finding", value);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
  }
  return <div className="space-y-6"><nav className="flex flex-wrap gap-3" aria-label="Evidence navigation"><Link className="source-link" href={`/investigations/${encodeURIComponent(id)}`}>Return to workbench</Link><Link className="source-link" href={`/investigations/${encodeURIComponent(id)}/report`}>Investigation report</Link></nav><header><p className="eyebrow">Source provenance and verification</p><h1>Evidence explorer</h1><p className="mt-2 text-sm text-muted-foreground">Inspect the original records behind a finding. Source integrity does not establish a medical diagnosis.</p></header>{error && <div role="alert" className="notice">{error} <Button onClick={retry}>Retry evidence</Button></div>}{!state && !error && <p role="status">Loading investigation evidence...</p>}{state && <><p className="text-xs break-all">{state.patient_id} · {state.case_id} · {id}</p><div className="evidence-explorer"><Panel title="Findings navigator">{!findings.length && <p>No findings recorded yet.</p>}{findings.map(item => <button key={item.id} className="audit-card text-left w-full" aria-pressed={item.id === findingId} onClick={() => chooseFinding(item.id)}><StatusBadge status={item.status} /><p className="mt-2 text-sm font-semibold">{item.title}</p><span className="text-xs">{item.id}</span></button>)}</Panel><div className="space-y-4">{findingId && !finding && <p role="alert" className="notice">The selected finding is not available in this investigation.</p>}{finding && <><FindingCard finding={finding} patientId={state.patient_id} onOpen={anchor => select([{ source: anchor.source, anchor }])} onCompare={item => select(comparisonSources(item.anchors))} /><Panel title="Evidence relationships"><label className="text-sm">Relationship<select className="field block" value={relationship} onChange={event => setRelationship(event.target.value)}><option value="all">All relationships</option>{["supports", "contradicts", "contextualizes", "derived_from"].map(value => <option key={value}>{value}</option>)}</select></label>{finding.anchors.filter(anchor => relationship === "all" || anchor.relationship === relationship).map((anchor, i) => <button key={i} className="source-link mr-2" onClick={() => select([{ source: anchor.source, anchor }])}>{anchor.source.id} · {anchor.field} · {anchor.relationship}</button>)}</Panel></>}{invalid ? <p role="alert" className="notice">The selected source is not evidence for this finding.</p> : <Panel title={sources.length > 1 ? "Side-by-side evidence comparison" : "Original source evidence"}>{!sources.length && <p className="text-sm text-muted-foreground">Select a finding and source anchor to inspect its recorded content, timestamps, encounter and provenance.</p>}<div className={sources.length > 1 ? "grid gap-5 xl:grid-cols-2" : "space-y-4"}>{sources.map((item, index) => <SourcePanel key={`${item.source.type}:${item.source.id}:${index}`} patientId={state.patient_id} investigationId={id} findingId={finding?.id} {...item} />)}</div></Panel>}</div></div></>}</div>;
}
