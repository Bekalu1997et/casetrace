"use client";
import { useCallback, useState } from "react";
import { toolAuditApi } from "@/lib/api/tool-audit";
import { useResource } from "@/lib/api/use-resource";
import { StatusBadge, Time, humanize } from "@/components/shared/presentation";
import { ErrorState, LoadingState } from "@/components/shared/resource-state";
import { Button } from "@/components/ui/button";
import type { SourceRef } from "@/types/investigation";
export function ToolInspector({ id, revision, onOpen }: { id: string; revision: number; onOpen: (source: SourceRef) => void }) {
  const [offset, setOffset] = useState(0);
  const load = useCallback((signal: AbortSignal) => toolAuditApi.list(id, offset, signal), [id, offset]);
  const result = useResource(`${id}:${offset}:${revision}`, load);
  return <section className="space-y-3"><h3 className="font-semibold">Tool execution inspector</h3>{result.error && <ErrorState onRetry={result.retry}>{result.error}</ErrorState>}{!result.data && !result.error && <LoadingState>Loading audited tool calls...</LoadingState>}{result.data && <>{!result.data.items.length && <p>No tool executions recorded.</p>}{result.data.items.map(call => <details className="audit-card" key={call.id}><summary><strong>{humanize(call.tool)}</strong> · {call.agent} · attempt {call.attempt} <StatusBadge status={call.status} /></summary><dl className="audit-fields"><div><dt>Tool execution</dt><dd>{call.id}</dd></div><div><dt>Agent execution</dt><dd>{call.agent_run_id}</dd></div><div><dt>Started</dt><dd><Time value={call.started_at} /></dd></div><div><dt>Completed</dt><dd><Time value={call.completed_at} /></dd></div><div><dt>Duration</dt><dd>{call.duration_ms === null ? "Not recorded" : `${call.duration_ms} ms`}</dd></div>{Object.entries(call.arguments).map(([key, value]) => <div key={key}><dt>{humanize(key)}</dt><dd>{value === null ? "Not supplied" : String(value)}</dd></div>)}</dl>{call.error_code && <p role="alert" className="mt-3">Tool error: {call.error_code}</p>}<div className="flex flex-wrap gap-2 mt-3">{call.source_refs.map((source, i) => <button className="source-link" key={`${source.type}:${source.id}:${i}`} onClick={() => onOpen(source)}>{source.id}</button>)}</div><p className="text-xs text-muted-foreground mt-3">Full result payload unavailable; these are the retained audit references. Only allowlisted scalar parameters are shown.</p></details>)}<div className="flex gap-3"><Button variant="outline" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 20))}>Previous tool calls</Button><Button variant="outline" disabled={offset + 20 >= result.data.total} onClick={() => setOffset(offset + 20)}>Next tool calls</Button></div></>}</section>;
}
