"use client";
import { useEffect, useState } from "react";
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
        setEvents(previous => mergeEvents(previous, page.items));
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
          cursor = Math.max(cursor, event.sequence);
          setEvents(previous => mergeEvents(previous, [event]));
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
        setConnection("Reconnecting — showing persisted state");
        reconnectTimer = setTimeout(() => void connect(), 2500);
      }
    };
    void connect();
    return () => { controller.abort(); clearTimeout(refreshTimer); clearTimeout(reconnectTimer); };
  }, [id, revision]);
  return { state, findings, events, error, connection, retry: () => setRevision(value => value + 1) };
}
