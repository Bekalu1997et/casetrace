"use client";
import {useEncounter} from "../hooks/use-encounter";
import {LoadingState,ErrorState} from "@/components/shared/resource-state";
import {RecordCard} from "@/features/records/components/record-card";
import {ClinicalList} from "@/features/patients/components/clinical-list";
import type {RecordSection} from "@/types/hospital";
export function EncounterDetail({patientId,encounterId}:{patientId:string;encounterId:string}) {
 const state=useEncounter(patientId,encounterId);
 return <div className="space-y-6"><h2>Encounter workspace</h2>{!state.data&&!state.error&&<LoadingState>Loading encounter...</LoadingState>}{state.error&&<ErrorState onRetry={state.retry}>{state.error}</ErrorState>}{state.data&&<><RecordCard record={state.data} section="encounters"/>{(["clinical-events","documents","observations","medications","diagnostic-reports","imaging-studies","referrals"] as RecordSection[]).map(section=><ClinicalList key={section} patientId={patientId} section={section} encounterId={encounterId}/>)}</>}</div>;
}
