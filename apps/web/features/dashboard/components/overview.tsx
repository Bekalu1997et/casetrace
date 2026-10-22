"use client";
import {useState} from "react";
import Link from "next/link";
import { ApiStatus } from "@/components/system/api-status";
import { PatientDirectory } from "@/features/patients/components/patient-directory";
import { useOverview } from "../hooks/use-overview";
import { LoadingState, ErrorState } from "@/components/shared/resource-state";
import { CaseCard } from "@/features/cases/components/case-library";
import { InvestigationHistory } from "@/features/investigations/components/history";
export function Overview() {
 const state = useOverview();
 const [patientTotal,setPatientTotal]=useState<number>();
 return <div className="space-y-7"><header className="flex flex-wrap justify-between gap-4"><div><p className="eyebrow">Clinical investigation workspace</p><h1>Hospital Overview</h1><p className="mt-3 text-sm text-muted-foreground">Explore the synthetic clinical archive. Follow original records into an evidence-backed investigation.</p></div><div className="flex items-center gap-3"><Link className="action-link" href="/patients">Start Investigation</Link><Link className="source-link" href="/cases">Browse Cases</Link></div></header>
 {!state.data && !state.error && <LoadingState>Loading hospital inventory...</LoadingState>}{state.error && <ErrorState onRetry={state.retry}>{state.error}</ErrorState>}
 {state.data && <><dl className="hospital-metrics">{Object.entries({"Available cases":state.data.cases.pagination.total,"Imported patients":patientTotal??"Unavailable","Active investigations":state.data.active,"Completed investigations":state.data.completed,...(!state.data.cases.pagination.has_more ? {"Available-case encounters":state.data.cases.data.reduce((n,c)=>n+(c.counts.encounters??0),0),"Available-case documents":state.data.cases.data.reduce((n,c)=>n+(c.counts.documents??0),0)} : {})}).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{state.data.cases.data[0] && <CaseCard item={state.data.cases.data[0]} />}</>}
 <div className="grid gap-6 xl:grid-cols-2"><InvestigationHistory /><ApiStatus /></div>
 <section className="hospital-card"><h2>Investigation workflow</h2><div className="mt-5 grid gap-5 md:grid-cols-3">{[["01 / Retrieve","Discover source records"],["02 / Investigate","Connect clinical evidence across time"],["03 / Verify","Check findings against original records"]].map(([title,text])=><div key={title}><p className="eyebrow">{title}</p><p className="text-sm">{text}</p></div>)}</div></section><PatientDirectory embedded onTotal={setPatientTotal} /></div>;
}
