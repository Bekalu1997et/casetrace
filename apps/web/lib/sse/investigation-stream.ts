import { investigationsApi } from "@/lib/api/investigations";
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
  const response = await fetch(investigationsApi.streamUrl(id, after), {
    signal, headers: { Accept: "text/event-stream" }, cache: "no-store",
  });
  if (!response.ok || !response.body) throw new Error("Live activity is unavailable.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replaceAll("\r\n", "\n");
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) >= 0) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = frame.split("\n").filter(line => line.startsWith("data:"))
          .map(line => line.slice(5).trimStart()).join("\n");
        if (!data) continue;
        const event: unknown = JSON.parse(data);
        if (!event || typeof event !== "object" || !("id" in event) ||
          !("sequence" in event) || !("investigation_id" in event) ||
          !("type" in event) || !("timestamp" in event) || !("payload" in event) ||
          typeof event.id !== "string" || !Number.isInteger(event.sequence) ||
          event.investigation_id !== id || typeof event.type !== "string" ||
          typeof event.timestamp !== "string" || !event.payload || typeof event.payload !== "object")
          throw new Error("Invalid live activity received. Reconnect to restore persisted history.");
        receive(event as InvestigationEvent);
      }
    }
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}
