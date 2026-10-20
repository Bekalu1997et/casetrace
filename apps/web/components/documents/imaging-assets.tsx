"use client";
import { useCallback } from "react";
import { DocumentAsset } from "@/components/documents/document-asset";
import { Button } from "@/components/ui/button";
import { useHospitalData } from "@/hooks/use-hospital-data";
import { hospitalApi } from "@/lib/api/hospital";

export function ImagingAssets({ studyId }: { studyId: string }) {
  const load = useCallback((signal: AbortSignal) => hospitalApi.imagingAssets(studyId, signal), [studyId]);
  const state = useHospitalData(studyId, load);
  return <div className="mt-4 space-y-3">
    {!state.data && !state.error && <p role="status">Loading imaging assets…</p>}
    {state.error && <p role="alert">{state.error} <Button variant="outline" onClick={state.retry}>Retry images</Button></p>}
    {state.data?.data.length === 0 && <p className="text-sm">No image assets registered.</p>}
    {state.data?.data.map(asset => <div key={asset.id}><p className="text-sm">{asset.id} · {asset.asset_type}</p><DocumentAsset documentId={asset.id} mimeType={asset.mime_type} imaging /></div>)}
  </div>;
}
