import type { InvestigationEvent } from "@/types/investigation";
import { StatusBadge, Time, humanize } from "@/components/shared/presentation";

export function WorkflowRail({ events }: { events: InvestigationEvent[] }) {
  const stages = new Map<string, { status: string; timestamp: string }>();
  for (const event of events) if (event.type.startsWith("stage.") && typeof event.payload.stage === "string") stages.set(event.payload.stage, { status: event.type.slice(6) === "started" ? "running" : event.type.slice(6), timestamp: event.timestamp });
  return <section className="space-y-3"><h3 className="font-semibold text-sm">Workflow stages</h3>{!stages.size && <p className="text-xs text-muted-foreground">No stage activity recorded yet.</p>}<ol className="workflow-rail">{[...stages].map(([stage, value]) => <li key={stage}><span className="capitalize text-sm">{humanize(stage)}</span><StatusBadge status={value.status} /><p className="text-xs mt-2"><Time value={value.timestamp} /></p></li>)}</ol></section>;
}
