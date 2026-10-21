import { afterEach, expect, it, vi } from "vitest";
import { investigationsApi } from "@/lib/api/investigations";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("creates through the shared client with a stable idempotency key", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    investigation_id: "INV-test", patient_id: "SYN-test", status: "queued", created_at: "2026-01-01T00:00:00Z",
  }), { status: 202 }));
  vi.stubGlobal("fetch", fetchMock);
  expect((await investigationsApi.create("SYN-test", "timeline_investigation", "stable-key")).investigation_id).toBe("INV-test");
  expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/investigations");
  const options = fetchMock.mock.calls[0][1];
  expect(options.method).toBe("POST");
  expect(options.headers["Idempotency-Key"]).toBe("stable-key");
  expect(JSON.parse(options.body)).toEqual({ patient_id: "SYN-test", objective: "timeline_investigation" });
});

it("preserves report-not-ready errors and rejects malformed state", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
    error: { code: "REPORT_NOT_READY", message: "Report unavailable", request_id: "req-test" },
  }), { status: 409 })).mockResolvedValueOnce(new Response("{}")));
  await expect(investigationsApi.report("INV-test")).rejects.toMatchObject({ code: "REPORT_NOT_READY", status: 409 });
  await expect(investigationsApi.get("INV-test")).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
});

it("keeps future events and their sequence and centralizes reconnect URLs", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [{
    id: "EVT-test", investigation_id: "INV-test", sequence: 5, type: "future.event",
    timestamp: "2026-01-01T00:00:00Z", payload: {},
  }], total: 1 }))));
  expect((await investigationsApi.events("INV-test", 4)).items[0].type).toBe("future.event");
  expect(investigationsApi.streamUrl("INV-test", 5)).toBe("http://localhost:8000/api/investigations/INV-test/stream?after=5");
});
