"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useHospitalData } from "@/hooks/use-hospital-data";
import { hospitalApi } from "@/lib/api/hospital";

export function PatientDirectory() {
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState("");
  const load = useCallback((signal: AbortSignal) => hospitalApi.patients(offset, signal, query), [offset, query]);
  const state = useHospitalData(`patients:${offset}:${query}`, load);
  return <section className="space-y-5" aria-labelledby="directory-title">
    <div><p className="eyebrow">Hospital records</p><h1 id="directory-title">Synthetic patient directory</h1>
      <p className="mt-2 text-sm text-muted-foreground">Source clinical records. Select a patient to browse the available history.</p></div>
    <label className="block text-sm">Search patients<input className="field mt-2 block w-full" type="search" value={query} placeholder="Name or patient identifier" onChange={event => { setQuery(event.target.value); setOffset(0); }} /></label>
    {!state.data && !state.error && <p role="status">Loading patients…</p>}
    {state.error && <div role="alert">{state.error} <Button variant="outline" onClick={state.retry}>Retry</Button></div>}
    {state.data && <><p className="text-sm text-muted-foreground">{state.data.pagination.total} patients available</p>
      {state.data.data.length === 0 ? <p>No synthetic patients imported. Import a validated canonical case to populate this directory.</p>
        : <ul className="divide-y divide-border rounded-lg border border-border bg-card">{state.data.data.map(patient => <li key={patient.id} className="p-5">
          <Link className="font-semibold text-teal underline" href={`/patients/${encodeURIComponent(patient.id)}`}>{patient.display_name}</Link>
          <p className="mt-1 text-sm text-muted-foreground">{patient.synthetic_identifier} · {patient.id} · {patient.case_id}</p>
        </li>)}</ul>}
      <div className="flex gap-3"><Button variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>Previous patients</Button>
        <Button variant="outline" disabled={!state.data.pagination.has_more} onClick={() => setOffset(offset + 20)}>Next patients</Button></div></>}
  </section>;
}
