import { fetchApi, ApiRequestError } from "@/lib/api/client";
import { parseEvent } from "@/lib/validation/investigation";
import type { InvestigationEvent } from "@/types/investigation";

export function mergeEvents(previous: InvestigationEvent[], incoming: InvestigationEvent[]) {
  const rows = new Map(previous.map(event => [event.id, event]));
  incoming.forEach(event => rows.set(event.id, event));
  return [...rows.values()].sort((a, b) => a.sequence - b.sequence);
}

// Fetch streaming supports every event name, including future event types. A native
// EventSource only dispatches named events to explicitly registered listeners.
export async function readInvestigationStream(id: string, after: number,
  signal: AbortSignal, receive: (event: InvestigationEvent) => void) {
  const response = await fetchApi(`/api/investigations/${encodeURIComponent(id)}/stream?after=${after}`, signal, { headers: { Accept: "text/event-stream" } }, true);
  if (!response.ok || !response.body) throw new ApiRequestError("Live activity is unavailable.", "STREAM_ERROR", response.status);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary: number;
      while ((boundary = buffer.search(/\r?\n\r?\n/)) >= 0) {
        const frame = buffer.slice(0, boundary);
        const separator = buffer.slice(boundary).match(/^\r?\n\r?\n/)![0];
        buffer = buffer.slice(boundary + separator.length);
        const data = frame.split(/\r?\n/).filter(line => line.startsWith("data:"))
          .map(line => line.slice(5).trimStart()).join("\n");
        if (!data) continue;
        let parsed: unknown;
        try { parsed = JSON.parse(data); }
        catch { throw new ApiRequestError("Invalid live activity JSON.", "INVALID_RESPONSE"); }
        receive(parseEvent(parsed, id));
      }
    }
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}
