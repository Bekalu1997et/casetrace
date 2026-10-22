"use client";
import { useState } from "react";
import { useClinicalRecords } from "../hooks/use-chart";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/resource-state";
import { RecordLinks, sourceTypes } from "@/features/records/components/record-links";
import type { RecordSection } from "@/types/hospital";
import { LabTrend } from "@/features/laboratory/components/lab-trend";
import { ImagingAssets } from "@/features/imaging/components/imaging-assets";

const columns:Partial<Record<RecordSection,string[]>>={
 diagnoses:["name","status","code_system","code","diagnosed_at"], symptoms:["name","status","onset_at","description","severity","frequency"],
 encounters:["encounter_type","department","started_at","ended_at","provider_name","status"],
 observations:["test_name","test_code","value_numeric","value_text","unit","reference_range_low","reference_range_high","specimen_collected_at","reported_at","status"],
 medications:["medication_name","generic_name","dose","dose_unit","route","frequency","ordered_at","start_at","end_at","status","prescriber"],
 documents:["title","document_type","author","event_at","authored_at","mime_type","has_asset"],
 "imaging-studies":["modality","body_region","performed_at","reported_at","status"],
 "clinical-events":["event_type","description","occurred_at","documented_at"],
 "diagnostic-reports":["title","report_type","issued_at","status","conclusion"],
 referrals:["reason","referring_department","referred_department","ordered_at","appointment_at","status"],
 timeline:["title","event_type","timestamp","timestamp_type","description","timestamps"],
};
export function displayValue(value:unknown):string {if(value==null)return "Not documented";if(typeof value==="object")return Object.entries(value).map(([k,v])=>`${k}: ${v??"Not documented"}`).join(" ? ");return String(value);}
export function ClinicalList({patientId,section,encounterId,compact=false}:{patientId:string;section:RecordSection;encounterId?:string;compact?:boolean}) {
 const [filters,setFilters]=useState<Record<string,string>>({}),[offset,setOffset]=useState(0);
 const state=useClinicalRecords(patientId,section,offset,{...filters,...(encounterId?{encounter_id:encounterId}:{}),...(compact?{limit:"5"}:{})});
 const fields=columns[section]??["name","status"];
 return <section className="hospital-card space-y-4 min-w-0"><h2 className="capitalize">{section==="observations"?"Laboratory results":section.replaceAll("-"," ")}</h2>
 {section==="medications"&&<p className="text-sm text-muted-foreground">Recorded orders and histories do not establish administration or adherence. Associations do not establish causality.</p>}
 {section==="timeline"&&<p className="text-sm text-muted-foreground">Known instants only; date-only and unknown primary times remain in original record sections. Named times retain their meaning and precision.</p>}
 {!compact&&<form className="hospital-filters" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);setFilters(Object.fromEntries([...data.entries()].map(([k,v])=>[k,String(v).trim()]).filter(([,v])=>v)));setOffset(0);}}>
 {section==="documents"&&<label>Search document text<input className="field block" name="q" placeholder="Literal text or title" maxLength={200}/></label>}
 {section==="documents"&&<label>Document type<input className="field block" name="document_type" placeholder="Exact recorded type"/></label>}
 {section==="observations"&&<label>Test code<input className="field block" name="test_code" placeholder="Exact test code"/></label>}
 {section==="medications"&&<label>Recorded status<select name="status" className="field block"><option value="">All</option>{["ordered","active","discontinued","held","completed","unknown"].map(v=><option key={v}>{v}</option>)}</select></label>}
 {section==="timeline"&&<label>Source category<select name="event_types" className="field block"><option value="">All</option>{Object.values(sourceTypes).map(v=><option key={v}>{v}</option>)}</select></label>}
 {!encounterId&&<label>Encounter ID<input className="field block" name="encounter_id" placeholder="Exact encounter ID"/></label>}
 {section!=="medications"&&<><label>From (clinical date)<input type="date" className="field block" name="from_date"/></label><label>Through (clinical date)<input type="date" className="field block" name="to_date"/></label></>}
 <button className="source-link">Apply record filters</button></form>}
 {!state.data&&!state.error&&<LoadingState>Loading clinical records...</LoadingState>}{state.error&&<ErrorState onRetry={state.retry}>{state.error}</ErrorState>}
 {state.data&&<>{!state.data.data.length?<EmptyState>No {section.replaceAll("-"," ")} records available for these filters.</EmptyState>:compact?<ul className="divide-y divide-border">{state.data.data.map(record=><li key={record.id} className="py-4 space-y-2"><p className="text-sm font-medium">{displayValue(record.title??record.test_name??record.medication_name??record.name??record.department??record.description??record.id)}</p><p className="text-xs text-muted-foreground">{displayValue(record.started_at??record.event_at??record.occurred_at??record.specimen_collected_at??record.issued_at)}{record.value_numeric!=null?` ? ${record.value_numeric} ${record.unit??""}`:""}</p><RecordLinks record={record} patientId={patientId} section={section}/></li>)}</ul>:<div className="clinical-table-scroll" tabIndex={0} role="region" aria-label={`${section} table`}><table className="clinical-table"><thead><tr><th scope="col">Original source</th>{fields.map(field=><th scope="col" key={field}>{field.replaceAll("_"," ")}</th>)}</tr></thead><tbody>{state.data.data.map(record=><tr key={record.id}><td><RecordLinks record={record} patientId={patientId} section={section}/></td>{fields.map(field=><td key={field}>{displayValue(record[field])}</td>)}</tr>)}</tbody></table></div>}
 <p className="text-xs text-muted-foreground">{state.data.pagination.total} matching records. Original source offsets and date precision retained.</p><div className="flex gap-3"><button className="source-link" disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-state.data!.pagination.limit))}>Previous records</button><button className="source-link" disabled={!state.data.pagination.has_more} onClick={()=>setOffset(offset+state.data!.pagination.limit)}>Next records</button></div>
 {section==="observations"&&!compact&&<LabTrend patientId={patientId} records={state.data.data}/>}
 {section==="imaging-studies"&&state.data.data.map(record=><div key={record.id} className="border-t border-border pt-5"><h3 className="font-semibold">{record.id} · {displayValue(record.body_region)}</h3><RecordLinks record={record} section={section} patientId={patientId}/><ImagingAssets studyId={record.id}/></div>)}
 </>}
 </section>;
}
