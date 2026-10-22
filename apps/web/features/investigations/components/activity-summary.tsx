import { humanize, Time } from "@/components/shared/presentation";
import type { InvestigationEvent } from "@/types/investigation";
export function ActivitySummary({ events }: { events: InvestigationEvent[] }) {
  const recent = events.filter(event => /^(agent|tool|task|lead)\./.test(event.type)).slice(-4);
  return <section className="workspace-panel" aria-label="Recent investigation activity"><h2 className="panel-heading">Recent investigation activity</h2><ol className="divide-y divide-border px-4">{recent.map(event => <li key={event.id} className="py-3 text-xs"><span className="font-semibold capitalize">{humanize(event.type)}</span>{typeof (event.payload.tool ?? event.payload.agent) === "string" && <span> · {humanize(String(event.payload.tool ?? event.payload.agent))}</span>}<span className="block text-muted-foreground mt-1"><Time value={event.timestamp} /></span></li>)}</ol>{!recent.length && <p className="p-4 text-sm text-muted-foreground">Waiting for persisted backend activity.</p>}</section>;
}
