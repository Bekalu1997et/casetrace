"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { hospitalApi } from "@/lib/api/hospital";
import { catalogApi } from "@/lib/api/catalog";
import { useResource } from "@/lib/api/use-resource";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/resource-state";
import { Button } from "@/components/ui/button";
import { StartInvestigation } from "./start-investigation";

function PatientContext({ patientId, caseId }: { patientId: string; caseId: string }) {
  const load = useCallback((signal: AbortSignal) => catalogApi.summary(patientId, signal), [patientId]);
  const result = useResource(patientId, load);
  return <section className="hospital-card space-y-4"><h2>Available clinical records</h2>{result.error && <ErrorState onRetry={result.retry}>{result.error}</ErrorState>}{!result.data && !result.error && <LoadingState>Loading record inventory...</LoadingState>}{result.data && <><dl className="hospital-metrics">{Object.entries(result.data).filter(([key]) => key.endsWith("_count")).map(([key, value]) => <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd>{value}</dd></div>)}</dl><StartInvestigation key={patientId} patientId={patientId} caseId={caseId} /></>}</section>;
}
export function NewInvestigation() {
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<{ id: string; case_id: string; display_name: string }>();
  const load = useCallback((signal: AbortSignal) => hospitalApi.patients(offset, signal, query), [offset, query]);
  const result = useResource(`${query}:${offset}`, load);
  return <div className="space-y-6"><Link className="source-link" href="/investigations">All investigations</Link><header><p className="eyebrow">New evidence review</p><h1>Start an investigation</h1><p className="mt-2 text-sm text-muted-foreground">Choose an imported synthetic patient, review available records, then confirm an objective.</p></header><section className="hospital-card space-y-4"><label className="block text-sm">Find an imported patient<input type="search" className="field block w-full" value={query} onChange={e => { setQuery(e.target.value); setOffset(0); }} /></label>{result.error && <ErrorState onRetry={result.retry}>{result.error}</ErrorState>}{!result.data && !result.error && <LoadingState>Loading patients...</LoadingState>}{result.data && <>{!result.data.data.length && <EmptyState>No imported patients match this search.</EmptyState>}<ul className="divide-y divide-border">{result.data.data.map(patient => <li key={patient.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><strong>{patient.display_name}</strong><p className="text-xs">{patient.id} · {patient.case_id}</p></div><Button variant={selected?.id === patient.id ? "default" : "outline"} aria-pressed={selected?.id === patient.id} onClick={() => setSelected(patient)}>Select {patient.id}</Button></li>)}</ul><div className="flex gap-3"><Button variant="outline" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 20))}>Previous patients</Button><Button variant="outline" disabled={!result.data.pagination.has_more} onClick={() => setOffset(offset + 20)}>Next patients</Button></div></>}</section>{selected && <><p role="status" className="text-sm">Selected: {selected.display_name} · {selected.id} · {selected.case_id}</p><PatientContext key={selected.id} patientId={selected.id} caseId={selected.case_id} /></>}</div>;
}
