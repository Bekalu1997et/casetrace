import { ImagingAssets } from "@/components/documents/imaging-assets";
import { DocumentAsset } from "@/components/documents/document-asset";
import type { ClinicalRecord, RecordSection } from "@/types/hospital";

const fields: Record<RecordSection, string[]> = {
  diagnoses: ["name", "code_system", "code", "status", "diagnosed_at"],
  symptoms: ["name", "onset_at", "severity", "frequency", "status", "description"],
  "diagnostic-reports": ["report_type", "title", "status", "issued_at", "conclusion", "document_id", "observation_ids", "imaging_study_id"],
  encounters: ["encounter_type", "department", "provider_name", "started_at", "ended_at", "status"],
  observations: ["test_name", "test_code", "value_numeric", "value_text", "unit", "reference_range_low", "reference_range_high", "status", "specimen_collected_at", "reported_at", "source_document_id"],
  medications: ["medication_name", "generic_name", "dose", "dose_unit", "route", "frequency", "status", "ordered_at", "start_at", "end_at", "prescriber", "source_document_id"],
  documents: ["title", "document_type", "author", "event_at", "authored_at", "mime_type"],
  "imaging-studies": ["modality", "body_region", "status", "performed_at", "reported_at", "report_document_id"],
  "clinical-events": ["event_type", "description", "occurred_at", "documented_at", "source_document_id"],
  referrals: ["referring_department", "referred_department", "reason", "ordered_at", "appointment_at", "status"],
  timeline: ["title", "event_type", "timestamp", "timestamp_type", "description"],
};
const labels: Record<string, string> = { value_numeric: "Numeric result", value_text: "Text result", reference_range_low: "Reference range low", reference_range_high: "Reference range high", start_at: "Documented start (source precision)", end_at: "Documented end (source precision)" };
export function RecordCard({ record, section }: { record: ClinicalRecord; section: RecordSection }) {
  return <article id={record.id} className="rounded-lg border border-border bg-card p-5">
    <h3 className="font-semibold">{record.id}</h3>
    {record.encounter_id && <p className="mt-1 text-xs text-muted-foreground">Encounter: {record.encounter_id}</p>}
    <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">{fields[section].map(field => <div key={field} className="min-w-0">
      <dt className="text-xs capitalize text-muted-foreground">{labels[field] ?? field.replaceAll("_", " ")}</dt>
      <dd className="mt-1 break-words text-sm">{record[field] == null ? "Not documented" : String(record[field])}</dd>
    </div>)}</dl>
    {section === "medications" && <p className="mt-4 text-xs text-muted-foreground">Orders and documented history do not establish administration or adherence.</p>}
    {section === "documents" && <><p className="mt-4 whitespace-pre-wrap border-t border-border pt-4 text-sm leading-6">{typeof record.text_content === "string" ? record.text_content : "No extracted note text available."}</p>
      {record.has_asset ? <DocumentAsset documentId={record.id} mimeType={String(record.mime_type)} /> : <p className="mt-3 text-sm text-muted-foreground">No document asset registered.</p>}</>}
    {section === "imaging-studies" && <ImagingAssets studyId={record.id} />}
    {section === "imaging-studies" && <p className="mt-4 text-xs text-muted-foreground">Synthetic illustrations are not clinically validated diagnostic images. Report references describe the source record.</p>}
    {section === "timeline" && record.source_ref && typeof record.source_ref === "object" && !Array.isArray(record.source_ref) && <p className="mt-3 text-sm">Source: {String(record.source_ref.type)} / {String(record.source_ref.id)}</p>}
  </article>;
}

