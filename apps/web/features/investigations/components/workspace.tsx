"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useInvestigation, isTerminal } from "../hooks/use-investigation";
import { useEvidenceSelection } from "@/features/evidence/hooks/use-evidence-selection";
import { Button } from "@/components/ui/button";
import { SourcePanel } from "@/features/evidence/components/source-panel";
import { comparisonSources } from "@/features/evidence/navigation";
import { FindingCard } from "./finding-card";
import { InvestigationTimeline } from "@/features/timeline/components/investigation-timeline";
import { AgentActivity } from "./agent-activity";
import { TaskActivity } from "./task-activity";
import { ToolInspector } from "./tool-inspector";
import { Hypotheses } from "./hypotheses";
import { Conversation } from "./conversation";
import { StatusBadge } from "@/components/shared/presentation";
import type { Anchor, SourceRef } from "@/types/investigation";

export function InvestigationWorkspace(props: { id: string; initialSource?: SourceRef }) {
  return <Workspace key={props.id} {...props} />;
}
function Workspace({ id, initialSource }: { id: string; initialSource?: SourceRef }) {
  const { state, findings, events, error, connection, retry } = useInvestigation(id);
  const [sources, setSources] = useEvidenceSelection(initialSource);
  const [activityOpen, setActivityOpen] = useState(false);
  const inspector = useRef<HTMLElement>(null);
  const hasSources = sources.length > 0;
  useEffect(() => {
    if (!hasSources) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inspector.current?.focus();
    return () => { previous?.focus(); };
  }, [hasSources]);
  const open = (anchor: Anchor) => setSources([{ source: anchor.source, anchor }]);
  return <div className={`chat-workspace ${hasSources ? "has-evidence" : ""}`}>
    <header className="chat-workspace-header"><div><p className="eyebrow">Case conversation {state && ` / ${state.case_id}`}</p><h1>CASETRACE</h1>{state && <Link className="text-xs text-teal" href={`/patients/${encodeURIComponent(state.patient_id)}`}>{state.patient_id} / Open patient record</Link>}</div><div className="flex flex-wrap items-center gap-3">{state && <StatusBadge status={state.status} />}<span className="text-xs text-muted-foreground" role="status">{connection}</span><Link className="source-link" href="/investigations">All investigations</Link></div></header>
    {error && <div role="alert" className="notice">{error} <Button variant="outline" onClick={retry}>Reconnect / refresh</Button></div>}
    {!state && !error && <p role="status">Loading investigation...</p>}
    {state && <div className="chat-workspace-body">
      <Conversation key={id} id={id} onOpen={open} onCompare={anchors => setSources(comparisonSources(anchors))} findings={findings}>{ask =>
        <section className="investigation-artifacts" aria-label="Investigation results and activity">
          {state.status === "failed" && <p role="alert" className="notice mb-3">This investigation failed. Persisted activity and partial findings remain available.</p>}
          <details className="compact-activity" onToggle={event => setActivityOpen(event.currentTarget.open)}><summary><strong>{state.status === "failed" ? "Investigation failed" : state.status === "cancelled" ? "Investigation cancelled" : isTerminal(state.status) ? "Investigation completed" : "CASETRACE is investigating..."}</strong><span className="block text-xs text-muted-foreground mt-1">{isTerminal(state.status) ? `${findings.length} persisted findings. View execution details` : events.at(-1)?.message ?? "Waiting for recorded activity. View investigation activity"}</span></summary>
            {activityOpen && <div className="space-y-4 mt-4"><AgentActivity agents={state.agents} events={events} onOpen={source => setSources([{ source }])} /><ToolInspector id={id} revision={state.version} onOpen={source => setSources([{ source }])} /><TaskActivity events={events} onOpen={source => setSources([{ source }])} /></div>}
          </details>
          {!!state.limitations.length && <details className="artifact-disclosure"><summary>Investigation limitations ({state.limitations.length})</summary><ul className="list-disc pl-5 text-sm mt-3">{state.limitations.map((text, i) => <li key={i}>{text}</li>)}</ul></details>}
          <details id="investigation-findings" className="artifact-disclosure"><summary>Findings ({findings.length})</summary><div className="space-y-3 mt-3">{!findings.length && <p>No persisted findings yet.</p>}{findings.map(finding => <FindingCard key={finding.id} patientId={state.patient_id} finding={finding} onAsk={item => ask(`Explain finding ${item.id}: ${item.title}. Which records support it?`)} onOpen={open} onCompare={item => setSources(comparisonSources(item.anchors))} />)}</div></details>
          <details className="artifact-disclosure"><summary>Timeline and hypotheses</summary><div className="mt-4 space-y-4"><InvestigationTimeline events={state.timeline} findings={findings} patientId={state.patient_id} onCompare={finding => setSources(comparisonSources(finding.anchors))} onOpen={source => setSources([{ source }])} /><Hypotheses items={state.hypotheses} onOpen={open} /></div></details>
          <div className="flex flex-wrap gap-3 mt-3"><Link className="source-link" href={`/investigations/${encodeURIComponent(id)}/evidence`}>Explore evidence</Link>{["completed", "completed_with_limitations"].includes(state.status) && <Link className="source-link" href={`/investigations/${encodeURIComponent(id)}/report`}>Open investigation report →</Link>}<Button variant="outline" onClick={retry}>Refresh persisted state</Button></div>
        </section>}
      </Conversation>
      {hasSources && <aside ref={inspector} tabIndex={-1} className="conversation-evidence" aria-label="Evidence inspector" onKeyDown={event => { if (event.key === "Escape") setSources([]); }}><div className="evidence-inspector-heading"><h2>{sources.length > 1 ? "Compare original records" : "Original evidence"}</h2><Button variant="outline" onClick={() => setSources([])}>Close evidence</Button></div><p className="text-xs text-muted-foreground mb-4">Original clinical records / synthetic demo</p>{sources.map((item, i) => <SourcePanel key={`${item.source.type}:${item.source.id}:${i}`} patientId={state.patient_id} investigationId={id} {...item} />)}</aside>}
    </div>}
  </div>;
}
