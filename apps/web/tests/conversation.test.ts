import { expect, it, vi } from "vitest";
import { chatApi } from "@/lib/api/chat";
import { traceEvents } from "@/features/investigations/components/agent-investigation-trace";
import type { InvestigationEvent } from "@/types/investigation";
it("orders replayed concurrent agent events and deduplicates stable identities", () => {
  const event = (sequence: number, run: string): InvestigationEvent => ({ id: `E-${sequence}`, sequence, investigation_id: "INV-1", type: "agent.started", timestamp: "2026-01-01T00:00:00Z", payload: { agent_run_id: run } });
  const first = event(1, "A"); const second = event(2, "B");
  expect(traceEvents([second, first, second])).toEqual([first, second]);
});
it("submits the investigation focus and preserves linked run identity", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
  const message = { id: "M1", role: "user", content: "Review medication evidence", citations: [], limitations: [], new_investigation_id: null, execution_mode: "deterministic_rules" };
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ user_message: message, assistant_message: { ...message, id: "M2", role: "assistant", new_investigation_id: "INV-CHILD" } })));
  vi.stubGlobal("fetch", fetch);
  try {
    const result = await chatApi.send("INV-1", message.content, "investigate", "medication");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ message: message.content, mode: "investigate", focus: "medication" });
    expect(result[1].new_investigation_id).toBe("INV-CHILD");
  } finally { vi.unstubAllGlobals(); vi.unstubAllEnvs(); }
});
