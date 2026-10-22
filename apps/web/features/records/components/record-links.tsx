import Link from "next/link";
import { hospitalSourceHref, documentHref, encounterHref } from "../navigation";
import type { ClinicalRecord, RecordSection } from "@/types/hospital";
import type { SourceRef } from "@/types/investigation";
export const sourceTypes:Partial<Record<RecordSection,SourceRef["type"]>>={encounters:"encounter",observations:"observation",medications:"medication",documents:"document","imaging-studies":"imaging_study","clinical-events":"clinical_event","diagnostic-reports":"diagnostic_report",referrals:"referral",diagnoses:"diagnosis",symptoms:"symptom"};
function source(record:ClinicalRecord,section:RecordSection):SourceRef|null {
 if(section!=="timeline") return sourceTypes[section]?{type:sourceTypes[section]!,id:record.id}:null;
 const ref=record.source_ref;
 return ref&&typeof ref==="object"&&!Array.isArray(ref)&&typeof ref.id==="string"&&typeof ref.type==="string"?ref as unknown as SourceRef:null;
}
export function RecordLinks({record,section,patientId}:{record:ClinicalRecord;section:RecordSection;patientId:string}) {
 const ref=source(record,section);
 const doc=record.source_document_id??record.report_document_id??record.document_id;
 return <div className="flex flex-col items-start gap-2">{ref&&<Link className="source-link" href={section==="encounters"?encounterHref(patientId,record.id):section==="documents"?documentHref(patientId,record.id):hospitalSourceHref(patientId,ref)}>{record.id}</Link>}{typeof doc==="string"&&<Link className="text-primary underline" href={documentHref(patientId,doc)}>Source document {doc}</Link>}{record.encounter_id&&<Link className="text-primary underline" href={encounterHref(patientId,record.encounter_id)}>Encounter {record.encounter_id}</Link>}{section!=="documents"&&typeof doc!=="string"&&<span className="text-xs text-muted-foreground">No linked source document</span>}</div>;
}
