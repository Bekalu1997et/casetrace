"use client";
import type { Investigation, InvestigationEvent, SourceRef } from "@/types/investigation";
import { humanize, StatusBadge, Time } from "@/components/shared/presentation";

export function traceEvents(events: InvestigationEvent[]) {
  return [...new Map(events.map(event => [event.id, event])).values()].sort((a, b) => a.sequence - b.sequence);
}
export function AgentInvestigationTrace({ state, events, onOpen }: { state: Investigation; events: InvestigationEvent[]; onOpen: (source: SourceRef) => void }) {
  const ordered = traceEvents(events);
  const groups = new Map<string, InvestigationEvent[]>();
  const toolRuns = new Map<string, string>();
  for (const event of ordered) {
    if (typeof event.payload.tool_execution_id === "string" && typeof event.payload.agent_run_id === "string") toolRuns.set(event.payload.tool_execution_id, event.payload.agent_run_id);
  }
  for (const event of ordered) {
    const key = typeof event.payload.agent_run_id === "string" ? event.payload.agent_run_id : toolRuns.get(String(event.payload.tool_execution_id)) ?? "supervisor";
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  const terminal = ["completed", "completed_with_limitations", "failed", "cancelled"].includes(state.status);
  const duration = state.started_at && state.completed_at ? Math.max(0, Math.round((Date.parse(state.completed_at) - Date.parse(state.started_at)) / 1000)) : null;
  return <details className="workspace-panel p-4">
    <summary className="cursor-pointer flex flex-wrap items-center gap-3"><StatusBadge status={state.status} /><span className="font-semibold">{terminal ? `Investigation ${humanize(state.status)}` : "Investigating patient history…"}</span><span className="text-xs text-muted-foreground">{state.agents.length} registered agents · {ordered.length} events{duration !== null && ` · ${duration}s`}</span></summary>
    <div className="space-y-3 mt-4" aria-label="Agent investigation trace">
      {!ordered.length && <p className="text-sm">Waiting for persisted investigation activity.</p>}
      {[...groups].map(([key, items]) => {
        const start = items.find(item => item.type === "agent.started");
        const end = items.findLast(item => ["agent.completed", "agent.failed"].includes(item.type));
        const name = typeof start?.payload.agent === "string" ? humanize(start.payload.agent) : key === "supervisor" ? "Investigation coordination" : "Agent execution";
        return <details key={key} className="audit-card"><summary className="cursor-pointer">{name} {start && <StatusBadge status={end ? end.type.split(".")[1] : terminal ? "interrupted" : "running"} />} <span className="text-xs text-muted-foreground">{items.length} events</span></summary><ol className="space-y-3 mt-3">{items.map(event => <li key={event.id} className="border-l-2 border-border pl-3"><p className="text-sm">{event.message || humanize(event.type)}</p><span className="text-xs text-muted-foreground"><Time value={event.timestamp} /></span>{Array.isArray(event.payload.source_refs) && event.payload.source_refs.map((ref, index) => ref && typeof ref === "object" && typeof ref.id === "string" && typeof ref.type === "string" ? <button className="source-link ml-3" key={index} onClick={() => onOpen({ id: ref.id as string, type: ref.type as string })}>{ref.id}</button> : null)}</li>)}</ol></details>;
      })}
    </div>
  </details>;
}
