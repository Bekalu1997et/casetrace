"use client";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/resource-state";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { RecordCard } from "@/features/records/components/record-card";
import { useResource } from "@/lib/api/use-resource";
import { hospitalApi } from "@/lib/api/hospital";
import type { RecordSection } from "@/types/hospital";

export function RecordSectionView({ patientId, section }: { patientId: string; section: RecordSection }) {
  const [offset, setOffset] = useState(0);
  const load = useCallback((signal: AbortSignal) => hospitalApi.records(patientId, section, offset, signal), [patientId, section, offset]);
  const state = useResource(`${patientId}:${section}:${offset}`, load);
  return <div className="space-y-4">
    {!state.data && !state.error && <LoadingState>Loading clinical records…</LoadingState>}
    {state.error && <ErrorState onRetry={state.retry} retryLabel="Retry records">{state.error}</ErrorState>}
    {state.data && <>{state.data.data.length === 0 ? <EmptyState>No {section.replaceAll("-", " ")} records available.</EmptyState>
      : state.data.data.map(record => <RecordCard key={record.id} record={record} section={section} />)}
      <p className="text-xs text-muted-foreground">{state.data.pagination.total} source records · {section === "timeline" ? "Known instants are shown in UTC." : "Source offsets and date-only precision are retained."}</p>
      <div className="flex gap-3"><Button variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>Previous records</Button>
        <Button variant="outline" disabled={!state.data.pagination.has_more} onClick={() => setOffset(offset + 20)}>Next records</Button></div></>}
  </div>;
}
