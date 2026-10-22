"use client";
import { useCallback } from "react";
import { hospitalApi } from "@/lib/api/hospital";
import { catalogApi } from "@/lib/api/catalog";
import { useResource } from "@/lib/api/use-resource";
import type { RecordSection } from "@/types/hospital";
export function useChart(patientId:string) {
 const load = useCallback(async (signal:AbortSignal) => { const [patient,summary]=await Promise.all([hospitalApi.patient(patientId,signal),catalogApi.summary(patientId,signal)]); return {patient,summary}; },[patientId]);
 return useResource(patientId,load);
}
export function useClinicalRecords(patientId:string,section:RecordSection,offset:number,filters:Record<string,string>) {
 const key=JSON.stringify([patientId,section,offset,filters]);
 const load=useCallback((signal:AbortSignal)=> { const [id,part,start,query]=JSON.parse(key) as [string,RecordSection,number,Record<string,string>]; const {from_date,to_date,...rest}=query; if(from_date)rest.start_at=`${from_date}T00:00:00Z`; if(to_date)rest.end_at=`${to_date}T23:59:59.999999Z`; return hospitalApi.records(id,part,start,signal,rest); },[key]);
 return useResource(key,load);
}
