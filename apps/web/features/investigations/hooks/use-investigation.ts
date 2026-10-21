"use client";
import { useEffect, useState } from "react";
import { ApiRequestError } from "@/lib/api/client";
import { investigationsApi } from "@/lib/api/investigations";
import { mergeEvents, readInvestigationStream } from "@/lib/sse/investigation-stream";
import type { Finding, Investigation, InvestigationEvent } from "@/types/investigation";

export const isTerminal = (status: string) => ["completed", "completed_with_limitations", "failed", "cancelled"].includes(status);
export function useInvestigation(id: string) {
  const [state, setState] = useState<Investigation>();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [events, setEvents] = useState<InvestigationEvent[]>([]);
  const [error, setError] = useState<string>();
  const [connection, setConnection] = useState("Connecting");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let cursor = 0;
    let attempts = 0;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let refreshing: Promise<Investigation> | undefined;
    const refresh = () => {
      if (refreshing) return refreshing;
      refreshing = Promise.all([investigationsApi.get(id, controller.signal), investigationsApi.findings(id, controller.signal)])
        .then(([snapshot, result]) => {
          if (!controller.signal.aborted) {
            setState(snapshot); setFindings(result.items); setError(undefined);
            const pending = sessionStorage.getItem(`casetrace:created:${id}`);
            if (pending) { sessionStorage.removeItem(pending); sessionStorage.removeItem(`casetrace:created:${id}`); }
          }
          return snapshot;
        }).finally(() => { refreshing = undefined; });
      return refreshing;
    };
    const backfill = async () => {
      while (!controller.signal.aborted) {
        const page = await investigationsApi.events(id, cursor, controller.signal);
        if (!page.items.length) break;
        cursor = Math.max(cursor, ...page.items.map(event => event.sequence));
        if (controller.signal.aborted) return;
        setEvents(previous => mergeEvents(previous.filter(event => event.investigation_id === id), page.items));
      }
    };
    const connect = async () => {
      try {
        setConnection("Reconciling");
        const snapshot = await refresh();
        await backfill();
        if (controller.signal.aborted) return;
        if (isTerminal(snapshot.status)) { setConnection("History restored"); return; }
        setConnection("Live");
        await readInvestigationStream(id, cursor, controller.signal, event => {
          if (controller.signal.aborted) return;
          cursor = Math.max(cursor, event.sequence);
          setEvents(previous => mergeEvents(previous.filter(item => item.investigation_id === id), [event]));
          if (refreshTimer) clearTimeout(refreshTimer);
          refreshTimer = setTimeout(() => { void refresh().catch(failure => {
            if (!controller.signal.aborted) setError(failure.message);
          }); }, 150);
        });
        const final = await refresh();
        if (isTerminal(final.status)) { await backfill(); setConnection("History restored"); return; }
        throw new Error("Live connection ended before investigation completion.");
      } catch (failure) {
        if (controller.signal.aborted) return;
        setError(failure instanceof Error ? failure.message : "Investigation unavailable.");
        const permanent = failure instanceof ApiRequestError &&
          (["INVALID_RESPONSE", "CONFIGURATION_ERROR", "SOURCE_SCOPE_MISMATCH"].includes(failure.code)
            || (failure.status != null && failure.status >= 400 && failure.status < 500 && ![408, 429].includes(failure.status)));
        if (permanent || attempts >= 5) { setConnection("Disconnected - refresh to retry"); return; }
        setConnection("Reconnecting \u2014 showing persisted state");
        reconnectTimer = setTimeout(() => void connect(), Math.min(2500 * 2 ** attempts++, 30000));
      }
    };
    void connect();
    return () => { controller.abort(); clearTimeout(refreshTimer); clearTimeout(reconnectTimer); };
  }, [id, revision]);
  const current = state?.id === id;
  return { state: current ? state : undefined, findings: current ? findings : [], events: events.filter(event => event.investigation_id === id), error, connection, retry: () => setRevision(value => value + 1) };
}
