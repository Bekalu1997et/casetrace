"use client";
import Link from "next/link";
import { useState } from "react";
import { useHistory } from "../hooks/use-history";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/resource-state";
export function InvestigationHistory({ patientId, caseId }: { patientId?: string; caseId?: string }) {
 const [offset,setOffset] = useState(0);
 const state = useHistory({ limit: "5", offset: String(offset), ...(patientId ? { patient_id: patientId } : {}), ...(caseId ? { case_id: caseId } : {}) });
 return <section className="hospital-card space-y-4"><h2>Recent investigations</h2>{!state.data && !state.error && <LoadingState>Loading investigation history...</LoadingState>}{state.error && <ErrorState onRetry={state.retry}>Investigation history unavailable: {state.error}</ErrorState>}{state.data && <>{!state.data.items.length && <EmptyState>No investigations created for this selection.</EmptyState>}<ul className="divide-y divide-border">{state.data.items.map(item => <li key={item.id} className="py-4 space-y-2"><Link className="text-primary underline break-all" href={`/investigations/${encodeURIComponent(item.id)}`}>{item.id}</Link><p className="text-sm">{item.case_id} · {item.patient_id} · {item.status.replaceAll("_"," ")}</p><p className="text-xs text-muted-foreground">Created {item.created_at} · {item.objective.replaceAll("_"," ")}</p></li>)}</ul><div className="flex gap-3"><button className="source-link" disabled={!offset} onClick={() => setOffset(Math.max(0,offset-5))}>Previous investigations</button><button className="source-link" disabled={offset+5>=state.data.total} onClick={() => setOffset(offset+5)}>Next investigations</button></div></>}</section>;
}
