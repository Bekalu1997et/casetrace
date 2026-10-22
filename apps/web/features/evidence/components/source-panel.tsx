"use client";
import Link from "next/link";
import { hospitalSourceHref } from "@/features/records/navigation";
import { RecordLinks } from "@/features/records/components/record-links";
import { LoadingState, ErrorState } from "@/components/shared/resource-state";
import { DocumentAsset } from "@/features/documents/components/document-asset";
import { RecordCard } from "@/features/records/components/record-card";

import { SourceHighlight } from "./source-highlight";
import { useSource } from "../hooks/use-source";
import { type SourceSelection } from "../navigation";
export function SourcePanel({ patientId, source, anchor, anchors, investigationId, findingId }: SourceSelection & { patientId: string; investigationId?: string; findingId?: string }) {
  const { section, state } = useSource(patientId, source);
  return <section aria-label={`Original source ${source.id}`} className="min-w-0 space-y-3">
    <p className="eyebrow">Original hospital source · {source.type}</p>
    {!state.data && !state.error && <LoadingState>Retrieving source {source.id}…</LoadingState>}
    {state.error && <ErrorState onRetry={state.retry} retryLabel="Retry source">Source unavailable: {state.error}</ErrorState>}
    {state.data && <>
      <Link className="source-link" href={hospitalSourceHref(patientId, source, investigationId, findingId)}>Open in hospital workspace</Link>
      {section && <RecordLinks patientId={patientId} record={state.data} section={section} />}
      {(anchors ?? (anchor ? [anchor] : [])).map((anchor, index) => <div key={index} className="rounded-lg border border-primary/25 bg-secondary p-4 text-sm space-y-2">
        <p className="font-semibold">Cited field: {anchor.field.replaceAll("_", " ")}</p>
        <p className="text-xs">Relationship: {anchor.relationship} · Encounter: {anchor.encounter_id ?? "Not recorded"}</p>
        <p className="whitespace-pre-wrap break-words"><SourceHighlight value={state.data?.[anchor.field]} anchor={anchor} /></p>
        {JSON.stringify(state.data?.[anchor.field]) !== JSON.stringify(anchor.expected) && <p role="alert" className="text-destructive">The current field differs from the investigation anchor. This source may have changed; the earlier verification does not verify the current value.</p>}
        {anchor.quote && <blockquote className="border-l-2 border-primary pl-3">Cited excerpt: “{anchor.quote}”</blockquote>}
        <p className="text-xs text-muted-foreground break-all">Investigation anchor · version {anchor.source_version} · SHA-256 {anchor.source_hash}</p>
        <p className="text-xs text-muted-foreground">Showing the current hospital record. The backend verified the cited version at investigation time. No PDF page locator is inferred.</p>
      </div>)}
      {source.type === "imaging_asset" ? <div className="space-y-3"><h3 className="font-semibold">{state.data.id}</h3><p className="text-sm">Study: {String(state.data.imaging_study_id)} · {String(state.data.asset_type)}</p><p className="text-xs text-muted-foreground">Synthetic illustration; not a clinically validated diagnostic image.</p><DocumentAsset documentId={state.data.id} mimeType={String(state.data.mime_type)} imaging /></div> : source.type === "patient" ? <dl className="text-sm space-y-2">{["id", "display_name", "synthetic_identifier", "case_id", "date_of_birth", "sex"].map(field => <div key={field}><dt className="text-muted-foreground capitalize">{field.replaceAll("_", " ")}</dt><dd>{String(state.data![field])}</dd></div>)}</dl> : section ? <RecordCard record={state.data} section={section} /> : null}
    </>}
  </section>;
}
