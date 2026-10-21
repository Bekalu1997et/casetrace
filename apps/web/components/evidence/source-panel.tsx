"use client";
import { useCallback } from "react";
import { hospitalApi, resolveImagingAsset } from "@/lib/api/hospital";
import { DocumentAsset } from "@/components/documents/document-asset";
import { ApiRequestError } from "@/lib/api/client";
import { useHospitalData } from "@/hooks/use-hospital-data";
import { RecordCard } from "@/components/patients/record-card";
import { Button } from "@/components/ui/button";
import type { ClinicalRecord, RecordSection } from "@/types/hospital";
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
export function SourcePanel({ patientId, source, anchor, anchors }: SourceSelection & { patientId: string }) {
  const section = sourceSections[source.type];
  const load = useCallback(async (signal: AbortSignal): Promise<ClinicalRecord> => {
    if (source.type === "imaging_asset") return resolveImagingAsset(patientId, source.id, signal);
    if (source.type === "patient") {
      if (source.id !== patientId) throw new ApiRequestError("Source does not belong to this patient.", "SOURCE_SCOPE_MISMATCH");
      return { ...await hospitalApi.patient(patientId, signal), patient_id: patientId };
    }
    if (!section) throw new ApiRequestError("This source type cannot be opened.", "UNSUPPORTED_SOURCE");
    return hospitalApi.source(patientId, section, source.id, signal);
  }, [patientId, section, source.id, source.type]);
  const state = useHospitalData(`${patientId}:${source.type}:${source.id}`, load);
  return <section aria-label={`Original source ${source.id}`} className="min-w-0 space-y-3">
    <p className="eyebrow">Original hospital source · {source.type}</p>
    {!state.data && !state.error && <p role="status">Retrieving source {source.id}…</p>}
    {state.error && <div role="alert">Source unavailable: {state.error} <Button variant="outline" onClick={state.retry}>Retry source</Button></div>}
    {state.data && <>
      {(anchors ?? (anchor ? [anchor] : [])).map((anchor, index) => <div key={index} className="rounded-lg border border-primary/25 bg-secondary p-4 text-sm space-y-2">
        <p className="font-semibold">Cited field: {anchor.field.replaceAll("_", " ")}</p>
        <p className="whitespace-pre-wrap break-words"><mark>{state.data?.[anchor.field] == null ? "Anchor unavailable in current source" : String(state.data?.[anchor.field])}</mark></p>
        {JSON.stringify(state.data?.[anchor.field]) !== JSON.stringify(anchor.expected) && <p role="alert" className="text-destructive">The current field differs from the investigation anchor. This source may have changed; the earlier verification does not verify the current value.</p>}
        {anchor.quote && <blockquote className="border-l-2 border-primary pl-3">Cited excerpt: “{anchor.quote}”</blockquote>}
        <p className="text-xs text-muted-foreground break-all">Investigation anchor · version {anchor.source_version} · SHA-256 {anchor.source_hash}</p>
        <p className="text-xs text-muted-foreground">Showing the current hospital record. The backend verified the cited version at investigation time. No PDF page or text-offset locator was supplied.</p>
      </div>)}
      {source.type === "imaging_asset" ? <div className="space-y-3"><h3 className="font-semibold">{state.data.id}</h3><p className="text-sm">Study: {String(state.data.imaging_study_id)} · {String(state.data.asset_type)}</p><p className="text-xs text-muted-foreground">Synthetic illustration; not a clinically validated diagnostic image.</p><DocumentAsset documentId={state.data.id} mimeType={String(state.data.mime_type)} imaging /></div> : source.type === "patient" ? <dl className="text-sm space-y-2">{["id", "display_name", "synthetic_identifier", "case_id", "date_of_birth", "sex"].map(field => <div key={field}><dt className="text-muted-foreground capitalize">{field.replaceAll("_", " ")}</dt><dd>{String(state.data![field])}</dd></div>)}</dl> : <RecordCard record={state.data} section={section} />}
    </>}
  </section>;
}
