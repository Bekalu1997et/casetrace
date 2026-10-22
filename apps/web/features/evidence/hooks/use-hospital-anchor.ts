"use client";
import {useCallback} from "react";
import {investigationsApi} from "@/lib/api/investigations";
import {useResource} from "@/lib/api/use-resource";
import type {SourceRef,Anchor} from "@/types/investigation";
export function useHospitalAnchor(patientId:string,source:SourceRef,investigation?:string,finding?:string) {
 const load=useCallback(async(signal:AbortSignal):Promise<Anchor[]>=>{
  if(!investigation)return [];
  const state=await investigationsApi.get(investigation,signal);
  if(state.patient_id!==patientId)throw new Error("Investigation does not belong to this patient.");
  if(!finding)return [];
  const result=await investigationsApi.finding(investigation,finding,signal);
  const anchors=result.anchors.filter(a=>a.source.id===source.id&&a.source.type===source.type);
  if(!anchors.length)throw new Error("Finding does not cite the requested source.");
  return anchors;
 },[patientId,source.id,source.type,investigation,finding]);
 return useResource(`${patientId}:${source.type}:${source.id}:${investigation}:${finding}`,load);
}
