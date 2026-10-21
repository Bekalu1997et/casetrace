"use client";
import { useCallback } from "react";
import { hospitalApi, resolveImagingAsset } from "@/lib/api/hospital";
import { ApiRequestError } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import type { ClinicalRecord } from "@/types/hospital";
import type { SourceRef } from "@/types/investigation";
import { sourceSections } from "../navigation";
export function useSource(patientId: string, source: SourceRef) {
  const section = Object.hasOwn(sourceSections, source.type) ? sourceSections[source.type] : undefined;
  const load = useCallback(async (signal: AbortSignal): Promise<ClinicalRecord> => {
    if (source.type === "imaging_asset") return resolveImagingAsset(patientId, source.id, signal);
    if (source.type === "patient") {
      if (source.id !== patientId) throw new ApiRequestError("Source does not belong to this patient.", "SOURCE_SCOPE_MISMATCH");
      return { ...await hospitalApi.patient(patientId, signal), patient_id: patientId };
    }
    if (!section) throw new ApiRequestError("This source type cannot be opened.", "UNSUPPORTED_SOURCE");
    return hospitalApi.source(patientId, section, source.id, signal);
  }, [patientId, section, source.id, source.type]);
  const state = useResource(`${patientId}:${source.type}:${source.id}`, load);
  return { section, state };
}
