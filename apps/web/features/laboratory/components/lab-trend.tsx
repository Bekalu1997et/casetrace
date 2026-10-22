"use client";
import Link from "next/link";
import {useState,useCallback} from "react";
import {catalogApi} from "@/lib/api/catalog";
import {useResource} from "@/lib/api/use-resource";
import {LoadingState,EmptyState,ErrorState} from "@/components/shared/resource-state";
import {hospitalSourceHref} from "@/features/records/navigation";
import type {ClinicalRecord} from "@/types/hospital";
export function LabTrend({patientId,records}:{patientId:string;records:ClinicalRecord[]}) {
 const codes=[...new Set(records.map(r=>r.test_code).filter((v):v is string=>typeof v==="string"))];
 const [selection,setSelection]=useState("");
 const code=selection||codes[0];
 return <section className="space-y-4 border-t border-border pt-5"><h3 className="font-semibold">Longitudinal laboratory trend</h3><label>Analyte code<select aria-label="Analyte code" className="field ml-3" value={code??""} onChange={event=>setSelection(event.target.value)}>{codes.map(v=><option key={v}>{v}</option>)}</select></label><p className="text-xs text-muted-foreground">Codes from this result page; selected series retrieves the complete numeric history. Points are observations, with no interpolated measurements or unit conversion.</p>{code?<Series key={`${patientId}:${code}`} patientId={patientId} code={code}/>:<EmptyState>No coded numeric analyte available.</EmptyState>}</section>;
}
function Series({patientId,code}:{patientId:string;code:string}) {
 const load=useCallback((signal:AbortSignal)=>catalogApi.series(patientId,code,signal),[patientId,code]);
 const state=useResource(`${patientId}:${code}`,load);
 const points=state.data?.points??[], timed=points.filter(p=>p.collected_at!==null), values=timed.map(p=>p.value_numeric);
 const min=Math.min(...values),span=Math.max(...values)-min||1, times=timed.map(p=>Date.parse(p.collected_at!)),start=Math.min(...times), duration=Math.max(...times)-start||1;
 return <>{!state.data&&!state.error&&<LoadingState>Loading series...</LoadingState>}{state.error&&<ErrorState onRetry={state.retry}>Trend unavailable; incompatible units are not combined. {state.error}</ErrorState>}{state.data&&<>{!points.length?<EmptyState>No numeric measurements.</EmptyState>:<><p className="text-sm">{code} · {points[0].unit??"Unit not recorded"} · {points.length} observations</p>{timed.length>0&&<svg viewBox="0 0 640 180" className="w-full max-h-60" role="img" aria-label={`${code} observed numeric measurements over collection time`}><text x="2" y="20" fontSize="10">{Math.max(...values)}</text><text x="2" y="145" fontSize="10">{min}</text><text x="30" y="175" fontSize="10">{timed[0].collected_at?.slice(0,10)}</text><text x="540" y="175" fontSize="10">{timed.at(-1)?.collected_at?.slice(0,10)}</text><path d="M30 10 V150 H620" fill="none" stroke="currentColor"/>{timed.map(p=><a key={p.observation_id} href={hospitalSourceHref(patientId,{type:"observation",id:p.observation_id})}><circle cx={40+550*(Date.parse(p.collected_at!)-start)/duration} cy={135-110*(p.value_numeric-min)/span} r="5" fill="var(--teal)"><title>{p.collected_at}: {p.value_numeric} {p.unit} · {p.observation_id}</title></circle></a>)}</svg>}<div className="clinical-table-scroll"><table className="clinical-table"><caption className="text-left">Exact measurements (collection time)</caption><thead><tr><th scope="col">Source</th><th scope="col">Collected at</th><th scope="col">Value</th><th scope="col">Unit</th></tr></thead><tbody>{points.map(p=><tr key={p.observation_id}><td><Link className="text-primary underline" href={hospitalSourceHref(patientId,{type:"observation",id:p.observation_id})}>{p.observation_id}</Link></td><td>{p.collected_at??"Unknown"}</td><td>{p.value_numeric}</td><td>{p.unit??"Not recorded"}</td></tr>)}</tbody></table></div></>}</>}</>;
}
