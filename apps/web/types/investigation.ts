export type InvestigationStatus = "queued" | "running" | "completed" |
  "completed_with_limitations" | "failed" | "cancelled";
export type Objective = "full_record_investigation" | "timeline_investigation" |
  "contradiction_investigation" | "medication_investigation" | "laboratory_investigation";
export interface SourceRef { type: string; id: string }
export interface Anchor {
  source: SourceRef; source_version: number; source_hash: string;
  encounter_id: string | null; field: string; expected: unknown; quote: string | null;
  relationship: "supports" | "contradicts" | "contextualizes" | "derived_from";
}
export interface Finding {
  id: string; investigation_id: string; type: string; title: string; claim: string;
  claim_kind: "observation" | "chronology" | "interpretation" | "hypothesis";
  status: "proposed" | "verified" | "rejected" | "unresolved";
  support_level: "strong" | "limited" | "insufficient"; anchors: Anchor[];
  alternatives: string[]; limitations: string[];
  verification: { status: "verified" | "rejected" | "inconclusive";
    classification: string; checks: { type: string; status: string; message: string }[] };
}
export interface InvestigationEvent {
  id: string; investigation_id: string; sequence: number; type: string;
  timestamp: string; payload: Record<string, unknown>;
}
export interface TimelineEvent {
  id: string; source: SourceRef; timestamp: string | null; timestamp_type: string;
  precision: "instant" | "day" | "unknown"; timestamps: Record<string, string | null>; title: string;
}
export interface Hypothesis {
  explanation: string; supports: Anchor[]; weakens: Anchor[];
  missing_evidence: string[]; verdict: "supported" | "weakened" | "inconclusive";
}
export interface Investigation {
  id: string; patient_id: string; case_id: string; objective: Objective;
  status: InvestigationStatus; version: number; created_at: string;
  started_at: string | null; completed_at: string | null;
  progress: { current_stage: string; completed_stages: number; total_stages: number; percent: number };
  agents: { name: string; status: "pending" | "running" | "completed" | "failed" }[];
  finding_summary: Record<string, number>; timeline: TimelineEvent[];
  hypotheses: Hypothesis[]; limitations: string[];
}
export interface InvestigationReport {
  investigation_id: string; status: InvestigationStatus;
  summary: { headline: string; description: string }; timeline: TimelineEvent[];
  verified_findings: Finding[]; rejected_findings: Finding[]; unresolved_findings: Finding[];
  hypotheses: Hypothesis[]; limitations: string[]; generated_at: string; execution_mode: string;
}
export interface InvestigationCreated {
  investigation_id: string; status: InvestigationStatus; patient_id: string; created_at: string;
}
