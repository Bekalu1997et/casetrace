"use client";
import {useState} from "react";
import {DocumentAsset} from "@/features/documents/components/document-asset";
import {useImagingAssets} from "../hooks/use-imaging-assets";
import {LoadingState,EmptyState,ErrorState} from "@/components/shared/resource-state";
export function ImagingAssets({studyId}:{studyId:string}) {
 const [offset,setOffset]=useState(0),[index,setIndex]=useState(0);
 const state=useImagingAssets(studyId,offset),asset=state.data?.data[index];
 return <section className="mt-4 space-y-3" aria-label={`Images for ${studyId}`}>
 {!state.data&&!state.error&&<LoadingState>Loading imaging assets...</LoadingState>}{state.error&&<ErrorState onRetry={state.retry}>{state.error}</ErrorState>}
 {state.data&&!state.data.data.length&&<EmptyState>No image assets registered.</EmptyState>}
 {asset&&<><p className="text-sm">{asset.id} / {asset.asset_type} / Image {offset+index+1} of {state.data!.pagination.total}</p><div className="flex flex-wrap gap-3"><button className="source-link" disabled={offset===0&&index===0} onClick={()=>{if(index>0)setIndex(index-1);else{setOffset(Math.max(0,offset-20));setIndex(19);}}}>Previous image</button><button className="source-link" disabled={index===state.data!.data.length-1&&!state.data!.pagination.has_more} onClick={()=>{if(index<state.data!.data.length-1)setIndex(index+1);else{setOffset(offset+20);setIndex(0);}}}>Next image</button></div><DocumentAsset key={asset.id} documentId={asset.id} mimeType={asset.mime_type} imaging/></>}
 </section>;
}
