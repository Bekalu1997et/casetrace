"use client";
import {useCallback} from "react";
import {hospitalApi} from "@/lib/api/hospital";
import {useResource} from "@/lib/api/use-resource";
export function useImagingAssets(studyId:string,offset:number) {
 const load=useCallback((signal:AbortSignal)=>hospitalApi.imagingAssets(studyId,signal,offset),[studyId,offset]);
 return useResource(`${studyId}:${offset}`,load);
}
