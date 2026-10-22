"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import { useChart } from "../hooks/use-chart";
import type { Patient, PatientSummary } from "@/types/hospital";
import { LoadingState, ErrorState } from "@/components/shared/resource-state";
import { StartInvestigation } from "@/features/investigations/components/start-investigation";
import { Time } from "@/components/shared/presentation";
const Context=createContext<{patient:Patient;summary:PatientSummary}|null>(null);
export function usePatientChart(){return useContext(Context);}
export function ChartLayout({patientId,children}:{patientId:string;children:ReactNode}) {
 const state=useChart(patientId), pathname=usePathname();
 const root=`/patients/${encodeURIComponent(patientId)}`;
 return <div className="space-y-6"><Link className="source-link" href="/patients">All synthetic patients</Link>{!state.data&&!state.error&&<LoadingState>Loading patient...</LoadingState>}{state.error&&<ErrorState onRetry={state.retry}>{state.error}</ErrorState>}{state.data&&<Context.Provider value={state.data}><header className="hospital-card flex flex-wrap justify-between gap-5"><div className="min-w-0"><p className="eyebrow">Hospital source record · Synthetic patient</p><h1>{state.data.patient.display_name}</h1><p className="mt-3 text-sm">{state.data.patient.synthetic_identifier} · Patient ID: {patientId} · <Link className="text-primary underline" href={`/cases/${encodeURIComponent(state.data.patient.case_id)}`}>Case {state.data.patient.case_id}</Link></p><dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Date of birth</dt><dd><Time value={state.data.patient.date_of_birth} compact /></dd></div><div><dt className="text-xs text-muted-foreground">Recorded sex</dt><dd>{state.data.patient.sex || "Not documented"}</dd></div><div><dt className="text-xs text-muted-foreground">Encounters</dt><dd>{state.data.summary.encounter_count}</dd></div><div><dt className="text-xs text-muted-foreground">Last encounter</dt><dd><Time value={state.data.summary.latest_encounter_at} compact />{!state.data.summary.latest_encounter_at&&<span className="sr-only">Last encounter: Not documented</span>}</dd></div></dl><p className="mt-3 text-xs text-muted-foreground">An earliest encounter date is not available in the patient summary contract.</p></div><StartInvestigation patientId={patientId} caseId={state.data.patient.case_id}/></header><nav aria-label="Patient chart navigation" className="clinical-tabs">{[["","Overview"],["timeline","Timeline"],["encounters","Encounters"],["labs","Laboratory"],["medications","Medications"],["documents","Documents"],["imaging","Imaging"]].map(([path,label])=><Link key={path} href={`${root}${path?`/${path}`:""}`} aria-current={pathname===`${root}${path?`/${path}`:""}`?"page":undefined}>{label}</Link>)}</nav>{children}</Context.Provider>}</div>;
}
