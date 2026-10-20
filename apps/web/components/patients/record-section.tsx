"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { RecordCard } from "@/components/patients/record-card";
import { useHospitalData } from "@/hooks/use-hospital-data";
import { hospitalApi } from "@/lib/api/hospital";
import type { RecordSection } from "@/types/hospital";

export function RecordSectionView({ patientId, section }: { patientId: string; section: RecordSection }) {
  const [offset, setOffset] = useState(0);
  const load = useCallback((signal: AbortSignal) => hospitalApi.records(patientId, section, offset, signal), [patientId, section, offset]);
  const state = useHospitalData(`${patientId}:${section}:${offset}`, load);
  return <div className="space-y-4">
    {!state.data && !state.error && <p role="status">Loading clinical records…</p>}
    {state.error && <div role="alert">{state.error} <Button variant="outline" onClick={state.retry}>Retry records</Button></div>}
    {state.data && <>{state.data.data.length === 0 ? <p>No {section.replaceAll("-", " ")} records available.</p>
      : state.data.data.map(record => <RecordCard key={record.id} record={record} section={section} />)}
      <p className="text-xs text-muted-foreground">{state.data.pagination.total} source records · {section === "timeline" ? "Known instants are shown in UTC." : "Source offsets and date-only precision are retained."}</p>
      <div className="flex gap-3"><Button variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>Previous records</Button>
        <Button variant="outline" disabled={!state.data.pagination.has_more} onClick={() => setOffset(offset + 20)}>Next records</Button></div></>}
  </div>;
}
