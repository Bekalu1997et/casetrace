"use client";
import { useCallback } from "react";
import { catalogApi } from "@/lib/api/catalog";
import { useResource } from "@/lib/api/use-resource";
import { ErrorState } from "@/components/shared/resource-state";
export function ClinicalContext({ patientId }: { patientId: string }) {
  const load = useCallback((signal: AbortSignal) => catalogApi.summary(patientId, signal), [patientId]);
  const result = useResource(patientId, load);
  return <div className="space-y-2 text-xs"><p className="font-semibold break-all">{patientId}</p>{!result.data && !result.error && <p role="status">Loading record availability...</p>}{result.error && <ErrorState onRetry={result.retry}>{result.error}</ErrorState>}{result.data && <dl className="space-y-2">{Object.entries(result.data).filter(([key]) => key.endsWith("_count")).map(([key, value]) => <div key={key} className="flex justify-between gap-2"><dt className="capitalize text-muted-foreground">{key.replace("_count", "").replaceAll("_", " ")}</dt><dd>{value}</dd></div>)}</dl>}</div>;
}
