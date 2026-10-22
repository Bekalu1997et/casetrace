"use client";
import {useViewerPanels} from "../hooks/use-viewer-panels";
import Link from "next/link";
import {useSource} from "@/features/evidence/hooks/use-source";
import {useClinicalRecords} from "@/features/patients/hooks/use-chart";
import {LoadingState,ErrorState} from "@/components/shared/resource-state";
import {DocumentAsset} from "./document-asset";
import {documentHref,encounterHref} from "@/features/records/navigation";
import {RecordLinks} from "@/features/records/components/record-links";
import {displayValue} from "@/features/patients/components/clinical-list";
function Nearby({patientId,encounterId,documentId}:{patientId:string;encounterId:string;documentId:string}) {
 const wide=useViewerPanels();
 const state=useClinicalRecords(patientId,"documents",0,{encounter_id:encounterId,limit:"100"});
 return <details open={wide} className="hospital-card space-y-4"><summary className="font-semibold">Encounter documents</summary>{state.error&&<ErrorState onRetry={state.retry}>{state.error}</ErrorState>}{!state.data&&!state.error&&<LoadingState>Loading nearby records...</LoadingState>}{state.data?.data.map(doc=><Link key={doc.id} aria-current={doc.id===documentId?"page":undefined} className="block text-sm text-primary underline" href={documentHref(patientId,doc.id)}>{displayValue(doc.title)}</Link>)}<Link className="source-link" href={encounterHref(patientId,encounterId)}>Back to encounter</Link></details>;
}
export function DocumentDetail({patientId,documentId}:{patientId:string;documentId:string}) {
 const wide=useViewerPanels();
 const {state}=useSource(patientId,{type:"document",id:documentId});
 const doc=state.data;
 return <div className="space-y-5"><Link className="source-link" href={`/patients/${encodeURIComponent(patientId)}/documents`}>Document library</Link>{!doc&&!state.error&&<LoadingState>Loading clinical document...</LoadingState>}{state.error&&<ErrorState onRetry={state.retry}>{state.error}</ErrorState>}{doc&&<><h2>{displayValue(doc.title)}</h2><div className="document-workspace">{doc.encounter_id?<Nearby patientId={patientId} encounterId={doc.encounter_id} documentId={documentId}/>:<p>No encounter recorded.</p>}<section className="hospital-card space-y-5"><h3 className="font-semibold">Original artifact</h3>{doc.has_asset?<DocumentAsset documentId={doc.id} mimeType={String(doc.mime_type)}/>:<p>No original asset registered.</p>}<h3 className="border-t border-border pt-5 font-semibold">Structured clinical text</h3><p className="text-xs text-muted-foreground">This representation is separate from the original artifact. Text offsets do not identify PDF pages.</p><p className="whitespace-pre-wrap text-sm leading-7">{displayValue(doc.text_content)}</p></section><details open={wide} className="hospital-card space-y-4"><summary className="font-semibold">Source metadata</summary><RecordLinks patientId={patientId} section="documents" record={doc}/><dl className="space-y-4 text-sm">{["document_type","author","event_at","authored_at","mime_type","has_asset"].map(field=><div key={field}><dt className="text-xs text-muted-foreground capitalize">{field.replaceAll("_"," ")}</dt><dd>{displayValue(doc[field])}</dd></div>)}</dl></details></div></>}</div>;
}
