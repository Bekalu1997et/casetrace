"use client";
import Link from "next/link";
import { useState } from "react";
import { useCase, useCases } from "../hooks/use-cases";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/resource-state";
import { InvestigationHistory } from "@/features/investigations/components/history";
import { StartInvestigation } from "@/features/investigations/components/start-investigation";
import type { CaseOverview } from "@/types/hospital";

export function CaseCard({ item, detail = false }: { item: CaseOverview; detail?: boolean }) {
  return <article className="hospital-card space-y-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="eyebrow">Synthetic clinical archive</p><h2><Link href={`/cases/${encodeURIComponent(item.case_id)}`}>{item.case_id}</Link></h2><p className="mt-2">{item.display_name ?? "Patient identity unavailable"}</p></div><span className={`status-badge ${item.status === "imported" ? "status-good" : "status-pending"}`}>{item.status.replaceAll("_", " ")}</span></div>
    <p className="text-sm text-muted-foreground">Dataset {item.version ?? "unavailable"} ({item.dataset_status ?? "status unavailable"}) · {item.counts.encounters ?? "Unknown"} encounters · {item.counts.documents ?? "Unknown"} documents</p>
    <p className="text-sm">Modalities: {item.modalities.join(" / ") || "Not published"}</p>
    {detail && <><h3 className="font-semibold">Record inventory</h3><dl className="hospital-metrics">{Object.entries(item.counts).map(([key, value]) => <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd>{value}</dd></div>)}</dl><p className="text-sm">Last recorded encounter: {item.latest_encounter_at ?? "Not available"}</p></>}
    <div className="flex flex-wrap items-center gap-4"><Link className="source-link" href={`/cases/${encodeURIComponent(item.case_id)}`}>Open case</Link>{item.imported && item.patient_id && item.display_name && <Link className="source-link" href={`/patients/${encodeURIComponent(item.patient_id)}`}>Open patient chart</Link>}{item.imported && item.status === "imported" && item.patient_id && <StartInvestigation patientId={item.patient_id} caseId={item.case_id} />}</div>
    {item.status !== "imported" && <p className="text-sm text-muted-foreground">This canonical source is not ready to launch from the library. Existing imported records, if linked, remain available for inspection.</p>}
  </article>;
}
export function CaseLibrary() {
  const [query, setQuery] = useState(""), [status, setStatus] = useState(""), [offset, setOffset] = useState(0);
  const state = useCases({ ...(query ? { case_id: query } : {}), ...(status ? { status } : {}), offset: String(offset) });
  return <div className="space-y-6"><header><p className="eyebrow">Hospital workspace</p><h1>Case Library</h1><p className="mt-3 text-muted-foreground">Actual imported records and locally validated canonical cases. Planned cases are not ready records.</p></header>
    <form className="hospital-filters" onSubmit={event => { event.preventDefault(); setQuery(String(new FormData(event.currentTarget).get("case_id") ?? "").trim()); setOffset(0); }}><label>Case identifier<input className="field block" name="case_id" placeholder="Exact case ID" pattern="[A-Za-z0-9][A-Za-z0-9_-]*" /></label><label>Availability<select className="field block" value={status} onChange={event => { setStatus(event.target.value); setOffset(0); }}><option value="">All statuses</option>{["imported", "available_not_imported", "invalid", "missing_assets", "source_conflict", "not_present"].map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><button className="source-link">Search cases</button></form>
    {!state.data && !state.error && <LoadingState>Loading cases...</LoadingState>}{state.error && <ErrorState onRetry={state.retry}>{state.error}</ErrorState>}
    {state.data && <>{!state.data.data.length && <EmptyState>No cases match. No imported or canonical cases are available for these filters.</EmptyState>}<div className="grid gap-5 xl:grid-cols-2">{state.data.data.map(item => <CaseCard key={item.case_id} item={item} />)}</div><div className="flex gap-3"><button className="source-link" disabled={!offset} onClick={() => setOffset(Math.max(0,offset-20))}>Previous cases</button><button className="source-link" disabled={!state.data.pagination.has_more} onClick={() => setOffset(offset+20)}>Next cases</button></div></>}
  </div>;
}
export function CaseDetail({ caseId }: { caseId: string }) {
 const state = useCase(caseId);
 return <div className="space-y-6"><Link className="source-link" href="/cases">Case Library</Link><h1>Case overview</h1>{!state.data && !state.error && <LoadingState>Loading case...</LoadingState>}{state.error && <ErrorState onRetry={state.retry}>{state.error}</ErrorState>}{state.data && <><CaseCard item={state.data} detail />{state.data.imported && <InvestigationHistory caseId={caseId}/>}</>}</div>;
}
