"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import { useChart } from "../hooks/use-chart";
import type { Patient, PatientSummary } from "@/types/hospital";
import { LoadingState, ErrorState } from "@/components/shared/resource-state";
import { StartInvestigation } from "@/features/investigations/components/start-investigation";
const Context=createContext<{patient:Patient;summary:PatientSummary}|null>(null);
export function usePatientChart(){return useContext(Context);}
export function ChartLayout({patientId,children}:{patientId:string;children:ReactNode}) {
 const state=useChart(patientId), pathname=usePathname();
 const root=`/patients/${encodeURIComponent(patientId)}`;
 return <div className="space-y-6"><Link className="source-link" href="/patients">All synthetic patients</Link>{!state.data&&!state.error&&<LoadingState>Loading patient...</LoadingState>}{state.error&&<ErrorState onRetry={state.retry}>{state.error}</ErrorState>}{state.data&&<Context.Provider value={state.data}><header className="hospital-card flex flex-wrap justify-between gap-5"><div><p className="eyebrow">Hospital source record · Synthetic patient</p><h1>{state.data.patient.display_name}</h1><p className="mt-3 text-sm">{state.data.patient.synthetic_identifier} · {patientId} · <Link className="text-primary underline" href={`/cases/${encodeURIComponent(state.data.patient.case_id)}`}>{state.data.patient.case_id}</Link></p><p className="mt-2 text-sm text-muted-foreground">Date of birth: {state.data.patient.date_of_birth} · Sex: {state.data.patient.sex}</p><p className="mt-2 text-sm">{state.data.summary.encounter_count} encounters · Last encounter: {state.data.summary.latest_encounter_at??"Not documented"}</p></div><StartInvestigation patientId={patientId} caseId={state.data.patient.case_id}/></header><nav aria-label="Patient chart navigation" className="clinical-tabs">{[["","Overview"],["timeline","Timeline"],["encounters","Encounters"],["labs","Laboratory"],["medications","Medications"],["documents","Documents"],["imaging","Imaging"]].map(([path,label])=><Link key={path} href={`${root}${path?`/${path}`:""}`} aria-current={pathname===`${root}${path?`/${path}`:""}`?"page":undefined}>{label}</Link>)}</nav>{children}</Context.Provider>}</div>;
}
