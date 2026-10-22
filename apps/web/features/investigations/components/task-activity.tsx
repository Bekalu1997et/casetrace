import type { InvestigationEvent, SourceRef } from "@/types/investigation";
import { StatusBadge, Time, humanize } from "@/components/shared/presentation";

const text = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value) : undefined;
function LeadOutcome({ id, tasks }: { id: string; tasks: Map<string, InvestigationEvent> }) {
  const task = [...tasks.values()].find(item => item.payload.lead_id === id);
  if (!task) return null;
  return <p className="text-sm mt-3">Follow-up task {text(task.payload.id ?? task.payload.task_id)}: <StatusBadge status={task.type.split(".").at(-1)!} /></p>;
}
export function TaskActivity({ events, onOpen }: { events: InvestigationEvent[]; onOpen: (source: SourceRef) => void }) {
  const tasks = new Map<string, InvestigationEvent>();
  const leads = new Map<string, InvestigationEvent>();
  for (const event of events) {
    if (event.type.startsWith("task.")) { const id = text(event.payload.id ?? event.payload.task_id); if (id) { const previous = tasks.get(id); tasks.set(id, { ...event, payload: { ...previous?.payload, ...event.payload } }); } }
    if (event.type.startsWith("lead.")) { const id = text(event.payload.id); if (id) { const previous = leads.get(id); leads.set(id, { ...event, payload: { ...previous?.payload, ...event.payload } }); } }
  }
  const groups: [string, Map<string, InvestigationEvent>][] = [["Agent tasks and handoffs", tasks], ["Investigative leads", leads]];
  return <div className="space-y-5">{groups.map(([title, records]) => <section key={title} className="space-y-3">
    <h3 className="font-semibold">{title}</h3>
    {!records.size && <p className="text-sm text-muted-foreground">No {title.toLowerCase()} recorded in this run. Baseline execution may not create adaptive tasks.</p>}
    {[...records].map(([id, event]) => <details className="audit-card" key={id}>
      <summary><span className="font-semibold">{text(event.payload.objective ?? event.payload.question) ?? id}</span><span className="ml-2"><StatusBadge status={event.type.split(".").at(-1)!} /></span></summary>
      <dl className="audit-fields">{["id", "assigned_agent", "source_agent", "parent_task", "originating_task", "lead_id", "agent_run_id", "reason", "decision", "missing_information", "attempts", "max_attempts", "error"].map(key => text(event.payload[key]) != null && <div key={key}><dt>{humanize(key)}</dt><dd>{text(event.payload[key])}</dd></div>)}</dl>
      <p className="text-xs mt-3">Last recorded activity: <Time value={event.timestamp} /></p>
      <LeadOutcome id={id} tasks={tasks} />
      {Array.isArray(event.payload.dependencies) && !!event.payload.dependencies.length && <p className="text-xs mt-3">Dependencies: {event.payload.dependencies.filter(value => typeof value === "string").join(", ")}</p>}
      {Array.isArray(event.payload.actions) && <div className="mt-3 text-xs"><h4 className="font-semibold">Requested retrieval actions</h4><ul>{event.payload.actions.map((value: unknown, i: number) => value && typeof value === "object" && "tool" in value && typeof value.tool === "string" ? <li key={i}>{humanize(value.tool)} (requested; inspect tool audit for execution)</li> : null)}</ul></div>}
      {["sources", "result_refs"].map(key => Array.isArray(event.payload[key]) && <div key={key}><p className="text-xs mt-3">{humanize(key)}</p>{event.payload[key].map((value: unknown, index: number) => { if (!value || typeof value !== "object" || !("id" in value) || !("type" in value) || typeof value.id !== "string" || typeof value.type !== "string") return null; const source = { id: value.id, type: value.type }; return <button key={index} className="source-link mr-2 mt-2" onClick={() => onOpen(source)}>{source.id}</button>; })}</div>)}
      <p className="text-xs text-muted-foreground mt-3">Status reflects the latest persisted event. Lead approval does not establish completion or clinical validity.</p>
    </details>)}
  </section>)}</div>;
}
