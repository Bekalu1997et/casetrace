"use client";
import { useState } from "react";
import Link from "next/link";
import { encounterHref } from "@/features/records/navigation";
import type { Finding, SourceRef, TimelineEvent } from "@/types/investigation";
import { humanize, Time } from "@/components/shared/presentation";

export function orderedTimeline(events: TimelineEvent[]) {
  return [...events].sort((a, b) => {
    if (!a.timestamp) return b.timestamp ? 1 : a.id.localeCompare(b.id);
    if (!b.timestamp) return -1;
    return Date.parse(a.timestamp) - Date.parse(b.timestamp) || a.id.localeCompare(b.id);
  });
}
export function InvestigationTimeline({ events, findings = [], onOpen, onCompare, patientId }: {
  events: TimelineEvent[]; findings?: Finding[]; onOpen: (source: SourceRef) => void;
  onCompare?: (finding: Finding) => void; patientId?: string;
}) {
  const [filter, setFilter] = useState("all");
  const [focusedFinding, setFocusedFinding] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const visible = orderedTimeline(events).filter(event => (filter === "all" || event.source.type === filter)
    && (focusedFinding === "all" || findings.some(finding => finding.id === focusedFinding && finding.anchors.some(anchor => anchor.source.id === event.source.id && anchor.source.type === event.source.type)))
    && (!from || !!event.timestamp && event.timestamp.slice(0, 10) >= from)
    && (!to || !!event.timestamp && event.timestamp.slice(0, 10) <= to));
  return <div className="space-y-5">
    {!!findings.length && <label className="block text-sm">Focus finding evidence<select className="field block w-full" value={focusedFinding} onChange={event => setFocusedFinding(event.target.value)}><option value="all">All source events</option>{findings.map(finding => <option key={finding.id} value={finding.id}>{finding.title} ({finding.status})</option>)}</select></label>}
    <div className="flex flex-wrap gap-3 items-end"><label className="text-sm">Event category<select className="field block" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All events</option>{[...new Set(events.map(event => event.source.type))].map(type => <option key={type} value={type}>{humanize(type)}</option>)}</select></label>
      <label className="text-sm">From date<input className="field block" type="date" value={from} onChange={event => setFrom(event.target.value)} /></label>
      <label className="text-sm">Through date<input className="field block" type="date" value={to} onChange={event => setTo(event.target.value)} /></label></div>
    <p className="text-xs text-muted-foreground">Original timezone offsets and date precision are preserved. Unknown dates appear last; date-only values do not imply a time of day.</p>
    {!visible.length && <p>No timeline events match this selection.</p>}
    <ol className="clinical-timeline">{visible.map(event => {
      const linked = findings.filter(finding => finding.anchors.some(anchor => anchor.source.id === event.source.id && anchor.source.type === event.source.type));
      return <li key={event.id} className="timeline-event"><div className="flex flex-wrap justify-between gap-2"><span className="eyebrow">{humanize(event.source.type)}</span><Time value={event.timestamp} /></div>
        <h3 className="mt-2 font-semibold">{event.title}</h3><p className="text-xs text-muted-foreground mt-1">Time basis: {humanize(event.timestamp_type)} · precision: {event.precision}</p>
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">{Object.entries(event.timestamps).map(([key, value]) => <div key={key}><dt className="text-muted-foreground">{humanize(key)}</dt><dd><Time value={value} /></dd></div>)}</dl>
        <button className="source-link mt-3" onClick={() => onOpen(event.source)}>Open source {event.source.id}</button>
        {linked.map(finding => <p className="mt-2 text-xs" key={finding.id}>Linked finding: {finding.title} · {finding.status}</p>)}
        {onCompare && linked.filter(finding => finding.anchors.length > 1).map(finding => <button className="source-link mt-2" key={finding.id} onClick={() => onCompare(finding)}>Compare evidence for {finding.title}</button>)}
        {patientId && [...new Set(linked.flatMap(finding => finding.anchors.filter(anchor => anchor.source.type === event.source.type && anchor.source.id === event.source.id).map(anchor => anchor.encounter_id)).filter((value): value is string => value !== null))].map(id => <Link className="source-link mt-2" key={id} href={encounterHref(patientId, id)}>Encounter {id}</Link>)}
      </li>;
    })}</ol>
  </div>;
}
