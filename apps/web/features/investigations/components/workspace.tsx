"use client";
import Link from "next/link";
import { useState } from "react";
import { useInvestigation, isTerminal } from "@/features/investigations/hooks/use-investigation";
import { useEvidenceSelection } from "@/features/evidence/hooks/use-evidence-selection";
import { Button } from "@/components/ui/button";
import { SourcePanel } from "@/features/evidence/components/source-panel";
import { comparisonSources } from "@/features/evidence/navigation";
import { FindingCard } from "@/features/investigations/components/finding-card";
import { InvestigationTimeline } from "@/features/timeline/components/investigation-timeline";
import { AgentActivity } from "./agent-activity";
import { ActivitySummary } from "./activity-summary";
import { ClinicalContext } from "./clinical-context";
import { WorkflowRail } from "./workflow";
import { TaskActivity } from "./task-activity";
import { ToolInspector } from "./tool-inspector";
import { Hypotheses } from "./hypotheses";
import { Panel, StatusBadge, Time, humanize } from "@/components/shared/presentation";
import type { Anchor, SourceRef } from "@/types/investigation";

export function InvestigationWorkspace({ id, initialSource }: { id: string; initialSource?: SourceRef }) {
  const { state, findings, events, error, connection, retry } = useInvestigation(id);
  const [tab, setTab] = useState("Findings");
  const [sources, setSources] = useEvidenceSelection(initialSource);
  const [findingType, setFindingType] = useState("all");
  const [findingStatus, setFindingStatus] = useState("all");
  const visibleFindings = [...findings].filter(item => (findingType === "all" || item.type === findingType) && (findingStatus === "all" || item.status === findingStatus))
    .sort((a, b) => Number(b.type === "timeline_contradiction") - Number(a.type === "timeline_contradiction"));
  const open = (anchor: Anchor) => setSources([{ source: anchor.source, anchor }]);
  return <div className="space-y-6">
    <nav aria-label="Breadcrumb" className="text-sm text-teal"><Link href="/">Hospital overview</Link> / {state && <><Link href={`/patients/${encodeURIComponent(state.patient_id)}`}>{state.patient_id}</Link> / </>}Investigation</nav>
    {!state && !error && <p role="status">Loading investigation…</p>}
    {error && <div role="alert" className="notice">{error} <Button variant="outline" onClick={retry}>Reconnect / refresh</Button></div>}
    {state && <>
      <header className="workspace-panel p-6 space-y-4"><div className="flex flex-wrap justify-between gap-4"><div><p className="eyebrow">Investigation workspace · {state.case_id}</p><h1>Investigation workbench</h1><p className="text-sm text-muted-foreground mt-2 break-all">{state.patient_id} · {state.id}</p></div><StatusBadge status={state.status} /></div>
        <div className="flex flex-wrap gap-5 text-xs"><span>Created: <Time value={state.created_at} /></span><span>Started: <Time value={state.started_at} /></span><span>Completed: <Time value={state.completed_at} /></span><span role="status">{connection}</span></div>
        <div><div className="flex justify-between gap-3 text-sm mb-2"><span className="capitalize">{humanize(state.progress.current_stage)}</span><span>{state.progress.completed_stages} / {state.progress.total_stages} stages</span></div><progress className="w-full accent-teal" max={state.progress.total_stages || 1} value={state.progress.completed_stages} aria-label="Completed investigation stages" /></div>
        <div className="flex flex-wrap items-center gap-4"><Link className="source-link" href="/investigations">All investigations</Link><Link className="source-link" href={`/investigations/${encodeURIComponent(id)}/evidence`}>Explore evidence</Link><Button variant="outline" onClick={retry}>Refresh persisted state</Button>{["completed", "completed_with_limitations"].includes(state.status) && <Link className="action-link" href={`/investigations/${encodeURIComponent(id)}/report`}>Open investigation report →</Link>}</div>
      </header>
      {state.status === "failed" && <p role="alert" className="notice">This investigation failed. Persisted activity and partial findings remain available. No completed report is implied. Review limitations and start a new run from the patient chart if needed.</p>}
      {!!state.limitations.length && <div className="notice"><h2>Investigation limitations</h2><ul className="mt-2 list-disc pl-5 text-sm">{state.limitations.map((text, i) => <li key={i}>{text}</li>)}</ul></div>}
      {sources.length > 1 && <div id="source-comparison"><Panel title="Conflicting records · side-by-side comparison"><Button variant="outline" onClick={() => setSources([])}>Close comparison</Button><div className="grid gap-5 xl:grid-cols-2">{sources.map((item, i) => <SourcePanel key={i} patientId={state.patient_id} investigationId={id} {...item} />)}</div></Panel></div>}
      <div className="workspace-grid">
        <aside className="space-y-4 workbench-context"><details open><summary className="panel-toggle">Clinical context and workflow</summary><div className="space-y-4 mt-3"><Panel title="Investigation context"><ClinicalContext patientId={state.patient_id} /><p className="text-sm capitalize">{humanize(state.objective)}</p><Link className="source-link" href={`/patients/${encodeURIComponent(state.patient_id)}`}>Open patient record</Link><p className="text-xs text-muted-foreground">Hospital records are original sources. Findings and hypotheses are investigation outputs.</p></Panel>
          <Panel title="Workflow"><WorkflowRail events={events} /></Panel><Panel title="Agent status">{state.agents.map(agent => <div key={agent.name} className="flex flex-wrap justify-between gap-2 border-b border-border pb-3 text-sm"><span className="capitalize">{humanize(agent.name)}</span><StatusBadge status={agent.status} /></div>)}</Panel></div></details>
        </aside>
        <div className="min-w-0 space-y-4"><ActivitySummary events={events} /><nav aria-label="Investigation views" className="flex flex-wrap gap-2">{["Findings", "Timeline", "Activity", "Tasks & leads", "Hypotheses"].map(value => <Button key={value} variant={tab === value ? "default" : "outline"} aria-pressed={tab === value} onClick={() => setTab(value)}>{value}</Button>)}</nav>
          <Panel title={tab}>
            {tab === "Findings" && <><div className="flex flex-wrap gap-3"><label className="text-xs">Finding category<select className="field block" value={findingType} onChange={event => setFindingType(event.target.value)}><option value="all">All categories</option>{[...new Set(findings.map(item => item.type))].map(type => <option key={type} value={type}>{humanize(type)}</option>)}</select></label><label className="text-xs">Verification state<select className="field block" value={findingStatus} onChange={event => setFindingStatus(event.target.value)}><option value="all">All states</option>{["proposed", "verified", "unresolved", "rejected"].map(status => <option key={status}>{status}</option>)}</select></label></div>{!visibleFindings.length && <p>{isTerminal(state.status) ? "No findings match this selection." : "No findings yet. Discoveries appear when the backend persists them."}</p>}{visibleFindings.map(finding => <FindingCard patientId={state.patient_id} key={finding.id} finding={finding} onOpen={open} onCompare={item => { setSources(comparisonSources(item.anchors)); window.scrollTo({ top: 0, behavior: "instant" }); }} />)}</>}
            {tab === "Timeline" && <InvestigationTimeline events={state.timeline} findings={findings} patientId={state.patient_id} onCompare={finding => setSources(comparisonSources(finding.anchors))} onOpen={source => setSources([{ source }])} />}
            {tab === "Activity" && <><ToolInspector id={id} revision={state.version} onOpen={source => setSources([{ source }])} /><AgentActivity agents={state.agents} events={events} onOpen={source => setSources([{ source }])} /></>}{tab === "Tasks & leads" && <TaskActivity events={events} onOpen={source => setSources([{ source }])} />}
            {tab === "Hypotheses" && <Hypotheses items={state.hypotheses} onOpen={open} />}
          </Panel>
        </div>
        <aside className="min-w-0 workbench-evidence"><details open><summary className="panel-toggle">Evidence and source records</summary><div className="mt-3"><Panel title={sources.length > 1 ? "Source comparison" : "Evidence inspector"}>{!sources.length ? <><p className="text-sm text-muted-foreground">Select a source reference from a finding, timeline event, hypothesis, or tool result to retrieve the original record.</p><div className="space-y-3">{findings.slice(0, 6).map(finding => <article className="audit-card" key={finding.id}><StatusBadge status={finding.status} /><p className="font-semibold text-sm mt-2">{finding.title}</p><Link className="source-link mt-2" href={`/investigations/${encodeURIComponent(id)}/evidence?finding=${encodeURIComponent(finding.id)}`}>Review evidence {finding.id}</Link></article>)}</div></> : <><Button variant="outline" onClick={() => setSources([])}>Close evidence</Button>{sources.length > 1 ? <a className="source-link" href="#source-comparison">Inspect comparison below ↓</a> : sources.map((item, i) => <SourcePanel key={`${item.source.type}:${item.source.id}:${i}`} patientId={state.patient_id} investigationId={id} {...item} />)}</>}</Panel></div></details></aside>
      </div>
    </>}
  </div>;
}
