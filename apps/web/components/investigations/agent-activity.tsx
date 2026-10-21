import type { Investigation, InvestigationEvent, SourceRef } from "@/types/investigation";
import { humanize, StatusBadge, Time } from "./presentation";

const safeFields = ["agent", "tool", "record_count", "error_code", "reason", "to_state", "from_state"];
export function AgentActivity({ agents, events, onOpen }: {
  agents: Investigation["agents"]; events: InvestigationEvent[]; onOpen: (source: SourceRef) => void;
}) {
  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2">{agents.map(agent => <article className="rounded-lg border border-border p-4" key={agent.name}><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold capitalize">{humanize(agent.name)} agent</h3><StatusBadge status={agent.status} /></div></article>)}</div>
    <h3 className="font-semibold">Persisted execution history</h3>
    {!events.length && <p>No activity has been persisted yet.</p>}
    <ol className="space-y-2">{events.map(event => {
      const start = events.find(item => (event.payload.tool_execution_id && item.type === "tool.started" && item.payload.tool_execution_id === event.payload.tool_execution_id)
        || (event.payload.agent_run_id && item.type === "agent.started" && item.payload.agent_run_id === event.payload.agent_run_id));
      const name = event.payload.tool ?? event.payload.agent ?? start?.payload.tool ?? start?.payload.agent;
      const refs = Array.isArray(event.payload.source_refs) ? event.payload.source_refs : [];
      return <li key={event.id}><details className="rounded-lg border border-border bg-background/50 p-3"><summary className="text-sm"><span className="font-mono text-xs text-muted-foreground mr-2">{event.sequence}</span>{humanize(event.type)}{typeof name === "string" && ` · ${humanize(name)}`}<span className="block mt-1 ml-6"><Time value={event.timestamp} /></span></summary>
        <dl className="mt-3 grid gap-2 text-xs">{safeFields.map(key => event.payload[key] == null ? null : <div key={key}><dt className="text-muted-foreground">{humanize(key)}</dt><dd className="break-words">{String(event.payload[key])}</dd></div>)}</dl>
        {refs.map((ref: unknown, index: number) => ref && typeof ref === "object" && "id" in ref && "type" in ref && typeof ref.id === "string" && typeof ref.type === "string" ? <button key={index} className="source-link mt-2 mr-2" onClick={() => onOpen(ref as SourceRef)}>{ref.id}</button> : null)}
        {start && start.id !== event.id && <p className="mt-2 text-xs">Started: <Time value={start.timestamp} /></p>}
      </details></li>;
    })}</ol>
  </div>;
}
