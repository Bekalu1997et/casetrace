"use client";
import Link from "next/link";
import { useState } from "react";
import { useHistory } from "../hooks/use-history";
import { StatusBadge, Time, humanize } from "@/components/shared/presentation";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/resource-state";
import { Button } from "@/components/ui/button";

export function InvestigationDirectory() {
  const [filters, setFilters] = useState({ patient_id: "", case_id: "", status: "" });
  const [offset, setOffset] = useState(0);
  const query = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
  const result = useHistory({ ...query, limit: "20", offset: String(offset) });
  function filter(key: keyof typeof filters, value: string) { setFilters({ ...filters, [key]: value }); setOffset(0); }
  return <div className="space-y-6">
    <header className="flex flex-wrap justify-between gap-4"><div><p className="eyebrow">Investigation library</p><h1>Investigations</h1><p className="mt-2 text-sm text-muted-foreground">Resume a live investigation or inspect a persisted evidence review.</p></div><Link className="action-link self-start" href="/investigations/new">New investigation</Link></header>
    <section className="hospital-card space-y-4">
      <div className="hospital-filters"><label>Patient identifier<input className="field block" value={filters.patient_id} onChange={e => filter("patient_id", e.target.value)} /></label><label>Case identifier<input className="field block" value={filters.case_id} onChange={e => filter("case_id", e.target.value)} /></label><label>Investigation status<select className="field block" value={filters.status} onChange={e => filter("status", e.target.value)}><option value="">All statuses</option>{["queued", "running", "completed", "completed_with_limitations", "failed", "cancelled"].map(status => <option key={status} value={status}>{humanize(status)}</option>)}</select></label></div>
      <p className="text-xs text-muted-foreground">Newest created first · exact identifier filters</p>
      {!result.data && !result.error && <LoadingState>Loading investigations...</LoadingState>}
      {result.error && <ErrorState onRetry={result.retry}>{result.error}</ErrorState>}
      {result.data && <>{!result.data.items.length ? <EmptyState>No investigations match this selection. Start a new investigation or clear the filters.</EmptyState> : <div className="clinical-table-scroll" tabIndex={0} role="region" aria-label="Investigation history"><table className="clinical-table"><thead><tr>{["Investigation / objective", "Patient / case", "Status / stage", "Execution times", "Actions"].map(title => <th scope="col" key={title}>{title}</th>)}</tr></thead><tbody>{result.data.items.map(item => <tr key={item.id}><td><Link className="text-primary underline" href={`/investigations/${encodeURIComponent(item.id)}`}>{item.id}</Link><p className="mt-2">{humanize(item.objective)}</p></td><td>{item.patient_id}<p>{item.case_id}</p></td><td><StatusBadge status={item.status} /><p className="mt-2">{item.current_stage ? humanize(item.current_stage) : "No recorded stage"}</p></td><td>Created: <Time value={item.created_at} /><p>Started: <Time value={item.started_at} /></p><p>Completed: <Time value={item.completed_at} /></p></td><td><Link className="source-link" href={`/investigations/${encodeURIComponent(item.id)}`}>Open workbench</Link>{["completed", "completed_with_limitations"].includes(item.status) && <Link className="source-link mt-2" href={`/investigations/${encodeURIComponent(item.id)}/report`}>Open report</Link>}</td></tr>)}</tbody></table></div>}
      <div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 20))}>Previous investigations</Button><Button variant="outline" disabled={offset + 20 >= result.data.total} onClick={() => setOffset(offset + 20)}>Next investigations</Button><span className="text-xs">{result.data.total} persisted investigations</span></div></>}
    </section>
  </div>;
}
