import { ApiRequestError, request } from "@/lib/api/client";
import type { ClinicalRecord, Collection, Patient, RecordSection } from "@/types/hospital";

const prefix = "/api/hospital/v1";
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiRequestError("Invalid hospital response.", "INVALID_RESPONSE");
  return value as Record<string, unknown>;
}
function stringFields(value: unknown, fields: string[]) {
  const record = object(value);
  if (fields.some(field => typeof record[field] !== "string")) throw new ApiRequestError("Invalid hospital record.", "INVALID_RESPONSE");
  return record;
}
export function parsePatient(value: unknown): Patient {
  const record = stringFields(value, ["id", "case_id", "synthetic_identifier", "display_name", "date_of_birth", "sex", "created_at"]);
  return record as unknown as Patient;
}
export function parseCollection<T>(value: unknown, parseItem: (item: unknown) => T): Collection<T> {
  const envelope = object(value), pagination = object(envelope.pagination), meta = object(envelope.meta);
  if (!Array.isArray(envelope.data) || typeof meta.request_id !== "string"
    || !Number.isInteger(pagination.limit) || !Number.isInteger(pagination.offset)
    || !Number.isInteger(pagination.total) || typeof pagination.has_more !== "boolean") {
    throw new ApiRequestError("Invalid hospital collection.", "INVALID_RESPONSE");
  }
  return { data: envelope.data.map(parseItem), pagination: pagination as unknown as Collection<T>["pagination"], meta: { request_id: meta.request_id } };
}
const required: Record<RecordSection, string[]> = {
  diagnoses: ["id", "patient_id", "name", "status"], symptoms: ["id", "patient_id", "name", "status"],
  "diagnostic-reports": ["id", "patient_id", "report_type", "title", "status"],
  encounters: ["id", "patient_id", "encounter_type", "department", "provider_name", "started_at", "status"],
  observations: ["id", "patient_id", "test_name", "status"], medications: ["id", "patient_id", "medication_name", "status"],
  documents: ["id", "patient_id", "title", "document_type", "mime_type"], "imaging-studies": ["id", "patient_id", "modality", "body_region", "status"],
  "clinical-events": ["id", "patient_id", "event_type", "description"], referrals: ["id", "patient_id", "referring_department", "referred_department", "reason", "status"],
  timeline: ["id", "patient_id", "event_type", "timestamp", "timestamp_type", "title"],
};
function parseRecord(section: RecordSection, value: unknown): ClinicalRecord {
  const record = stringFields(value, required[section]);
  if (section === "observations" && record.value_numeric !== null && typeof record.value_numeric !== "number") throw new ApiRequestError("Invalid laboratory value.", "INVALID_RESPONSE");
  if (section === "documents" && typeof record.has_asset !== "boolean") throw new ApiRequestError("Invalid document asset state.", "INVALID_RESPONSE");
  return record as ClinicalRecord;
}
export const hospitalApi = {
  patients: (offset = 0, signal?: AbortSignal) => request(`${prefix}/patients?offset=${offset}`, value => parseCollection(value, parsePatient), signal),
  patient: (id: string, signal?: AbortSignal) => request(`${prefix}/patients/${encodeURIComponent(id)}`, value => parsePatient(object(value).data), signal),
  records: (id: string, section: RecordSection, offset = 0, signal?: AbortSignal) => request(`${prefix}/patients/${encodeURIComponent(id)}/${section}?offset=${offset}`, value => parseCollection(value, item => parseRecord(section, item)), signal),
  imagingAssets: (id: string, signal?: AbortSignal) => request(`${prefix}/imaging-studies/${encodeURIComponent(id)}/assets`, value => parseCollection(value, item => stringFields(item, ["id", "imaging_study_id", "asset_type", "mime_type"]) as { id: string; imaging_study_id: string; asset_type: string; mime_type: string }), signal),
  documentAsset: async (id: string, signal?: AbortSignal, imaging = false): Promise<string> => {
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) throw new ApiRequestError("API address is not configured.", "CONFIGURATION_ERROR");
    const response = await fetch(`${base.replace(/\/$/, "")}${prefix}/${imaging ? "imaging-assets" : "documents"}/${encodeURIComponent(id)}/${imaging ? "content" : "asset"}`, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000), cache: "no-store" });
    if (!response.ok) throw new ApiRequestError("Document asset is unavailable.", "ASSET_UNAVAILABLE", response.status);
    const mime = response.headers.get("content-type")?.split(";")[0];
    if (!["application/pdf", "image/png", "image/jpeg", "text/plain", "text/html"].includes(mime ?? "")) throw new ApiRequestError("This document is available as a download only.", "UNSUPPORTED_PREVIEW");
    return URL.createObjectURL(await response.blob());
  },
};

