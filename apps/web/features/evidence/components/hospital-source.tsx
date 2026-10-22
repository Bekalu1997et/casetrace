"use client";
import Link from "next/link";
import {SourcePanel} from "./source-panel";
import {useHospitalAnchor} from "../hooks/use-hospital-anchor";
import {LoadingState,ErrorState} from "@/components/shared/resource-state";
import type {SourceRef} from "@/types/investigation";
export function HospitalSource({patientId,source,investigation,finding}:{patientId:string;source:SourceRef;investigation?:string;finding?:string}) {
 const state=useHospitalAnchor(patientId,source,investigation,finding);
 return <div className="space-y-5"><h2>Original clinical source</h2>{!state.data&&!state.error&&<LoadingState>Resolving source context...</LoadingState>}{state.error&&<ErrorState onRetry={state.retry}>{state.error}</ErrorState>}{state.data&&<>{investigation&&<div className="flex flex-wrap gap-2"><Link className="source-link" href={`/investigations/${encodeURIComponent(investigation)}?${new URLSearchParams({source:source.id,source_type:source.type})}`}>Return to investigation workbench</Link><Link className="source-link" href={`/investigations/${encodeURIComponent(investigation)}/evidence?${new URLSearchParams({source:source.id,source_type:source.type,...(finding?{finding}: {})})}`}>Return to evidence explorer</Link><Link className="source-link" href={`/investigations/${encodeURIComponent(investigation)}/report?${new URLSearchParams({source:source.id,source_type:source.type})}`}>Return to investigation report</Link></div>}<SourcePanel patientId={patientId} source={source} anchors={state.data}/></>}</div>;
}
