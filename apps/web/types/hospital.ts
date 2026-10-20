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
