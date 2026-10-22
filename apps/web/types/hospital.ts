export interface Patient {
  id: string; case_id: string; synthetic_identifier: string; display_name: string;
  date_of_birth: string; sex: string; created_at: string;
}
export interface ClinicalRecord {
  id: string; patient_id: string; encounter_id?: string | null;
  [key: string]: string | number | boolean | string[] | null | Record<string, unknown> | undefined;
}
export interface Collection<T> {
  data: T[];
  pagination: { limit: number; offset: number; total: number; has_more: boolean };
  meta: { request_id: string };
}
export type RecordSection = "encounters" | "observations" | "medications" | "documents" | "imaging-studies" | "clinical-events" | "referrals" | "timeline" | "diagnoses" | "symptoms" | "diagnostic-reports";

export interface CaseOverview {
  case_id: string; version: string | null; patient_id: string | null; display_name: string | null;
  status: string; imported: boolean; dataset_status: string | null; counts: Record<string, number>; modalities: string[]; latest_encounter_at: string | null;
}
export interface PatientSummary {
  patient_id: string; encounter_count: number; document_count: number; observation_count: number;
  medication_count: number; imaging_study_count: number; latest_encounter_at: string | null;
}
export interface LabSeries {
  patient_id: string; test_code: string;
  points: { observation_id: string; collected_at: string | null; value_numeric: number; unit: string | null }[];
}
export interface HistoryItem {
  id: string; patient_id: string; case_id: string; objective: string; status: string;
  created_at: string; started_at: string | null; completed_at: string | null; current_stage: string | null;
}
export interface HistoryPage { items: HistoryItem[]; total: number; limit: number; offset: number }

export interface EncounterRecord extends ClinicalRecord {
 encounter_type: string; department: string; provider_name: string; started_at: string; ended_at?: string | null; status: string;
}
export interface ObservationRecord extends ClinicalRecord {
 test_name: string; test_code?: string | null; value_numeric: number | null; value_text?: string | null;
 unit?: string | null; reference_range_low?: number | null; reference_range_high?: number | null;
 specimen_collected_at?: string | null; reported_at?: string | null; source_document_id?: string | null;
 status: "ordered" | "preliminary" | "final" | "corrected" | "cancelled";
}
export interface MedicationRecord extends ClinicalRecord {
 medication_name: string; generic_name?: string | null; dose?: number | null; dose_unit?: string | null;
 route?: string | null; frequency?: string | null; ordered_at?: string | null; start_at?: string | null; end_at?: string | null;
 prescriber?: string | null; source_document_id?: string | null;
 status: "ordered" | "active" | "discontinued" | "held" | "completed" | "unknown";
}
export interface DocumentRecord extends ClinicalRecord {
 title: string; document_type: string; author?: string | null; event_at?: string | null; authored_at?: string | null;
 mime_type: string; text_content?: string | null; has_asset: boolean;
}
export interface ImagingRecord extends ClinicalRecord {
 modality: string; body_region: string; performed_at?: string | null; reported_at?: string | null; status: string; report_document_id?: string | null;
}
export interface HospitalRecords {
 encounters: EncounterRecord; observations: ObservationRecord; medications: MedicationRecord;
 documents: DocumentRecord; "imaging-studies": ImagingRecord; "clinical-events": ClinicalRecord;
 "diagnostic-reports": ClinicalRecord; referrals: ClinicalRecord; timeline: ClinicalRecord; diagnoses: ClinicalRecord; symptoms: ClinicalRecord;
}
