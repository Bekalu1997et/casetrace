"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Investigation, InvestigationEvent, SourceRef } from "@/types/investigation";
import { humanize, StatusBadge, Time } from "@/components/shared/presentation";

const safeFields = ["agent", "tool", "record_count", "error_code", "reason", "to_state", "from_state"];
export function AgentActivity({ agents, events, onOpen }: {
  agents: Investigation["agents"]; events: InvestigationEvent[]; onOpen: (source: SourceRef) => void;
}) {
  const [visible, setVisible] = useState(50);
  const ends = new Map<string, InvestigationEvent>();
  const callCounts = new Map<string, number>();
  const starts = new Map<string, InvestigationEvent>();
  for (const event of events) {
    const runId = String(event.payload.agent_run_id ?? "");
    if (["agent.completed", "agent.failed"].includes(event.type)) ends.set(runId, event);
    if (event.type === "tool.started") callCounts.set(runId, (callCounts.get(runId) ?? 0) + 1);
    const key = event.type === "tool.started" ? `tool:${event.payload.tool_execution_id}`
      : event.type === "agent.started" ? `agent:${event.payload.agent_run_id}` : undefined;
    if (key && !starts.has(key)) starts.set(key, event);
  }
  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2">{agents.map(agent => <article className="rounded-lg border border-border p-4" key={agent.name}><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold capitalize">{humanize(agent.name)} agent</h3><StatusBadge status={agent.status} /></div></article>)}</div>
    <h3 className="font-semibold">Individual agent executions</h3>
    {[...starts.entries()].filter(([key]) => key.startsWith("agent:")).map(([key, start]) => {
      const end = ends.get(String(start.payload.agent_run_id));
      const count = callCounts.get(String(start.payload.agent_run_id)) ?? 0;
      return <details key={key} className="audit-card"><summary>{String(start.payload.agent)} · {String(start.payload.agent_run_id)} <StatusBadge status={end ? end.type.split(".")[1] : "running"} /></summary><p className="text-xs mt-3">Started: <Time value={start.timestamp} /> · Ended: <Time value={end?.timestamp ?? null} /></p><p className="text-sm mt-2">{count} recorded tool calls in this execution.</p>{end?.payload.error_code != null && <p role="alert">{String(end.payload.error_code)}</p>}</details>;
    })}
    <h3 className="font-semibold">Persisted execution history</h3>
    {!events.length && <p>No activity has been persisted yet.</p>}
    <ol className="space-y-2">{events.slice(-visible).map(event => {
      const start = (event.payload.tool_execution_id ? starts.get(`tool:${event.payload.tool_execution_id}`) : undefined)
        ?? (event.payload.agent_run_id ? starts.get(`agent:${event.payload.agent_run_id}`) : undefined);
      const name = event.payload.tool ?? event.payload.agent ?? start?.payload.tool ?? start?.payload.agent;
      const refs = Array.isArray(event.payload.source_refs) ? event.payload.source_refs : [];
      return <li key={event.id}><details className="rounded-lg border border-border bg-background/50 p-3"><summary className="text-sm"><span className="font-mono text-xs text-muted-foreground mr-2">{event.sequence}</span>{humanize(event.type)}{typeof name === "string" && ` · ${humanize(name)}`}<span className="block mt-1 ml-6"><Time value={event.timestamp} /></span></summary>
        <dl className="mt-3 grid gap-2 text-xs">{safeFields.map(key => event.payload[key] == null ? null : <div key={key}><dt className="text-muted-foreground">{humanize(key)}</dt><dd className="break-words">{String(event.payload[key])}</dd></div>)}</dl>
        {refs.map((ref: unknown, index: number) => ref && typeof ref === "object" && "id" in ref && "type" in ref && typeof ref.id === "string" && typeof ref.type === "string" ? <button key={index} className="source-link mt-2 mr-2" onClick={() => onOpen(ref as SourceRef)}>{ref.id}</button> : null)}
        {start && start.id !== event.id && <p className="mt-2 text-xs">Started: <Time value={start.timestamp} /></p>}
      </details></li>;
    })}</ol>
    {events.length > visible && <Button variant="outline" onClick={() => setVisible(value => value + 50)}>Show earlier activity ({events.length - visible} remaining)</Button>}
    {!!events.length && <p className="text-xs text-muted-foreground">Showing {Math.min(visible, events.length)} of {events.length} persisted events. Earlier events remain available.</p>}
  </div>;
}
