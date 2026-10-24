"use client";
import { useCallback } from "react";
import { investigationsApi } from "@/lib/api/investigations";
import { useResource } from "@/lib/api/use-resource";
export function InvestigationConclusion({ id }: { id: string }) {
  const load = useCallback((signal: AbortSignal) => investigationsApi.report(id, signal), [id]);
  const result = useResource(id, load);
  return <section className="workspace-panel p-5 space-y-3" aria-label="Investigation conclusion"><h2>Investigation conclusion</h2>{result.error && <p role="alert">{result.error} <button className="source-link" onClick={result.retry}>Retry report</button></p>}{!result.data && !result.error && <p role="status">Loading persisted report…</p>}{result.data && Object.entries(result.data.summary).map(([key, value]) => <div key={key}><h3 className="font-semibold capitalize">{key.replaceAll("_", " ")}</h3><p className="whitespace-pre-wrap text-sm">{value}</p></div>)}</section>;
}
