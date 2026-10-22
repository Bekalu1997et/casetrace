"use client";
import {useCallback} from "react";
import {useResource} from "@/lib/api/use-resource";
import {hospitalApi} from "@/lib/api/hospital";
export function useEncounter(patientId:string,encounterId:string) {
 const load=useCallback((signal:AbortSignal)=>hospitalApi.source(patientId,"encounters",encounterId,signal),[patientId,encounterId]);
 return useResource(`${patientId}:${encounterId}`,load);
}
