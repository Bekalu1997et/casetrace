import { request, ApiRequestError } from "./client";
import { object, parseCollection } from "./hospital";
import type { CaseOverview, PatientSummary, LabSeries, HistoryPage } from "@/types/hospital";
import { validateTime } from "@/lib/validation/time";

function fail(): never { throw new ApiRequestError("Invalid hospital discovery response.", "INVALID_RESPONSE"); }
function text(value: unknown): string { return typeof value === "string" ? value : fail(); }
function nullable(value: unknown): string | null { return value === null ? null : text(value); }
function count(value: unknown): number { return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fail(); }
export function parseCase(value: unknown): CaseOverview {
  const row = object(value), counts = object(row.counts);
  if (typeof row.imported !== "boolean" || !Array.isArray(row.modalities) || !["imported", "available_not_imported", "invalid", "missing_assets", "source_conflict", "not_present"].includes(text(row.status))) fail();
  return { case_id: text(row.case_id), version: nullable(row.version), patient_id: nullable(row.patient_id), display_name: nullable(row.display_name), status: text(row.status), imported: row.imported, dataset_status: nullable(row.dataset_status), counts: Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, count(value)])), modalities: row.modalities.map(text), latest_encounter_at: nullable(row.latest_encounter_at) };
}
export const catalogApi = {
  cases: (filters: Record<string, string> = {}, signal?: AbortSignal) => request(`/api/hospital/v1/cases?${new URLSearchParams(filters)}`, value => parseCollection(value, parseCase), signal),
  case: (id: string, signal?: AbortSignal) => request(`/api/hospital/v1/cases/${encodeURIComponent(id)}`, value => { const item = parseCase(object(value).data); if (item.case_id !== id) fail(); return item; }, signal),
  summary: (id: string, signal?: AbortSignal) => request(`/api/hospital/v1/patients/${encodeURIComponent(id)}/summary`, value => {
    const row = object(object(value).data);
    if (row.patient_id !== id) fail();
    return { patient_id: id, encounter_count: count(row.encounter_count), document_count: count(row.document_count), observation_count: count(row.observation_count), medication_count: count(row.medication_count), imaging_study_count: count(row.imaging_study_count), latest_encounter_at: nullable(row.latest_encounter_at) } satisfies PatientSummary;
  }, signal),
  series: (id: string, code: string, signal?: AbortSignal) => request(`/api/hospital/v1/patients/${encodeURIComponent(id)}/observations/series?test_code=${encodeURIComponent(code)}`, value => {
    const row = object(object(value).data);
    if (row.patient_id !== id || row.test_code !== code || !Array.isArray(row.points)) fail();
    const points = row.points.map(value => { const point = object(value); if (typeof point.value_numeric !== "number" || !Number.isFinite(point.value_numeric)) fail(); const time = nullable(point.collected_at); if (time) validateTime(time); return { observation_id: text(point.observation_id), collected_at: time, value_numeric: point.value_numeric, unit: nullable(point.unit) }; });
    if (new Set(points.map(point => point.unit)).size > 1) fail();
    return { patient_id: id, test_code: code, points } satisfies LabSeries;
  }, signal),
  history: (filters: Record<string, string> = {}, signal?: AbortSignal) => request(`/api/investigations?${new URLSearchParams(filters)}`, value => {
    const page = object(value); if (!Array.isArray(page.items)) fail();
    const items = page.items.map(value => { const row = object(value); const patient = text(row.patient_id), caseId = text(row.case_id), status = text(row.status); if ((filters.patient_id && filters.patient_id !== patient) || (filters.case_id && filters.case_id !== caseId) || (filters.status && filters.status !== status) || !["queued", "running", "completed", "completed_with_limitations", "failed", "cancelled"].includes(status)) fail(); validateTime(text(row.created_at)); return { id: text(row.id), patient_id: patient, case_id: caseId, objective: text(row.objective), status, created_at: text(row.created_at), started_at: nullable(row.started_at), completed_at: nullable(row.completed_at), current_stage: nullable(row.current_stage) }; });
    return { items, total: count(page.total), limit: count(page.limit), offset: count(page.offset) } satisfies HistoryPage;
  }, signal),
};
