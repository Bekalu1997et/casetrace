"use client";
import Link from "next/link";
import { useCallback } from "react";
import { useEvidenceSelection } from "@/hooks/use-evidence-selection";
import { useHospitalData } from "@/hooks/use-hospital-data";
import { investigationsApi } from "@/lib/api/investigations";
import { Button } from "@/components/ui/button";
import { SourcePanel, comparisonSources } from "@/components/evidence/source-panel";
import { FindingCard } from "@/components/findings/finding-card";
import { InvestigationTimeline } from "@/components/timeline/investigation-timeline";
import { AgentActivity } from "./agent-activity";
import { Hypotheses } from "./hypotheses";
import { Panel, StatusBadge, Time } from "./presentation";
import type { Anchor, SourceRef } from "@/types/investigation";

export function InvestigationReportView({ id, initialSource }: { id: string; initialSource?: SourceRef }) {
  const load = useCallback(async (signal: AbortSignal) => {
    const [state, report] = await Promise.all([investigationsApi.get(id, signal), investigationsApi.report(id, signal)]);
    if (report.investigation_id !== state.id) throw new Error("Report identity does not match this investigation.");
    const events = [];
    let after = 0;
    while (true) {
      const page = await investigationsApi.events(id, after, signal);
      if (!page.items.length) break;
      events.push(...page.items); after = page.items[page.items.length - 1].sequence;
    }
    return { state, report, events };
  }, [id]);
  const result = useHospitalData(id, load);
  const [selection, setSelection] = useEvidenceSelection(initialSource);
  const open = (anchor: Anchor) => setSelection([{ source: anchor.source, anchor }]);
  const data = result.data;
  return <div className="space-y-6 report-view">
    <nav aria-label="Breadcrumb" className="no-print text-sm text-teal"><Link href="/">Hospital overview</Link> / <Link href={`/investigations/${encodeURIComponent(id)}`}>Investigation workspace</Link> / Report</nav>
    {!data && !result.error && <p role="status">Retrieving persisted report…</p>}
    {result.error && <div role="alert" className="notice">Report unavailable: {result.error} <Button variant="outline" onClick={result.retry}>Retry report</Button><p className="mt-2 text-sm">A report is available only after backend finalization. <Link className="underline" href={`/investigations/${encodeURIComponent(id)}`}>Review investigation state</Link>.</p></div>}
    {data && <>
      <header className="workspace-panel p-6 space-y-3"><p className="eyebrow">Evidence-backed investigation report · {data.state.case_id}</p><h1>{data.report.summary.headline}</h1><StatusBadge status={data.report.status} /><p className="text-sm break-all">Patient {data.state.patient_id} · {id}</p>
        <p className="text-xs">Generated: <Time value={data.report.generated_at} /> · Execution mode: {data.report.execution_mode}</p><p className="text-xs">Started: <Time value={data.state.started_at} /> · Completed: <Time value={data.state.completed_at} /></p>
        <p className="font-semibold text-sm text-teal">SYNTHETIC DEMO — NOT FOR CLINICAL USE</p><Button variant="outline" className="no-print" onClick={() => window.print()}>Print report</Button></header>
      <Panel title="Executive summary"><p className="text-sm leading-7">{data.report.summary.description}</p><p className="text-xs text-muted-foreground">Inspect the findings below for original sources and verification checks. Evidence strength is not diagnostic probability.</p></Panel>
      {([['Verified findings', data.report.verified_findings], ['Unresolved findings', data.report.unresolved_findings], ['Rejected findings', data.report.rejected_findings]] as const).map(([title, items]) => <Panel key={title} title={title}>{!items.length && <p className="text-sm text-muted-foreground">No {title.toLowerCase()} in this report.</p>}{[...items].sort((a, b) => Number(b.type === "timeline_contradiction") - Number(a.type === "timeline_contradiction")).map(finding => <FindingCard key={finding.id} finding={finding} onOpen={open} onCompare={item => setSelection(comparisonSources(item.anchors))} />)}</Panel>)}
      {!!selection.length && <section className="workspace-panel p-5 space-y-4 no-print" aria-label="Report source evidence"><div className="flex justify-between gap-3"><h2>Original source evidence</h2><Button variant="outline" onClick={() => setSelection([])}>Close evidence</Button></div><div className="grid gap-5 lg:grid-cols-2">{selection.map((item, i) => <SourcePanel key={`${item.source.id}:${i}`} patientId={data.state.patient_id} {...item} />)}</div></section>}
      <Panel title="Reconstructed clinical timeline"><InvestigationTimeline events={data.report.timeline} onOpen={source => setSelection([{ source }])} /></Panel>
      <Panel title="Hypothesis comparison"><Hypotheses items={data.report.hypotheses} onOpen={open} /></Panel>
      <Panel title="Uncertainty and limitations">{data.report.limitations.length ? <ul className="list-disc pl-5 text-sm space-y-2">{data.report.limitations.map((text, i) => <li key={i}>{text}</li>)}</ul> : <p>No additional limitations were recorded by the backend.</p>}</Panel>
      <Panel title="Execution provenance"><p className="text-sm">Execution mode: {data.report.execution_mode}. The following activity comes from persisted backend events.</p><AgentActivity agents={data.state.agents} events={data.events} onOpen={source => setSelection([{ source }])} /></Panel>
    </>}
  </div>;
}
