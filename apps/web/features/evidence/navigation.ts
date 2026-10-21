import type { RecordSection } from "@/types/hospital";
import type { Anchor, SourceRef } from "@/types/investigation";

export const sourceSections: Record<string, RecordSection> = {
  encounter: "encounters", document: "documents", observation: "observations",
  medication: "medications", clinical_event: "clinical-events", imaging_study: "imaging-studies",
  diagnostic_report: "diagnostic-reports", referral: "referrals", diagnosis: "diagnoses", symptom: "symptoms",
};
export interface SourceSelection { source: SourceRef; anchor?: Anchor; anchors?: Anchor[] }
export function groupAnchors(anchors: Anchor[]): SourceSelection[] {
  const grouped = new Map<string, SourceSelection>();
  for (const anchor of anchors) {
    const key = `${anchor.source.type}:${anchor.source.id}`;
    const group = grouped.get(key) ?? { source: anchor.source, anchors: [] };
    group.anchors!.push(anchor); grouped.set(key, group);
  }
  return [...grouped.values()];
}
export function comparisonSources(anchors: Anchor[]): SourceSelection[] {
  const primary = groupAnchors(anchors.filter(anchor => ["supports", "contradicts"].includes(anchor.relationship)));
  return primary.length > 1 ? primary : groupAnchors(anchors);
}
