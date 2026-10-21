import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SourceHighlight } from "@/features/evidence/components/source-highlight";
import { useEvidenceSelection } from "@/features/evidence/hooks/use-evidence-selection";
import { useInvestigation } from "@/features/investigations/hooks/use-investigation";
import { Hypotheses } from "@/features/investigations/components/hypotheses";
import { useResource } from "@/lib/api/use-resource";
import { ApiRequestError, request } from "@/lib/api/client";
import { investigationsApi } from "@/lib/api/investigations";
import { parseState, parseFinding, parseEvent } from "@/lib/validation/investigation";
import { validateTime } from "@/lib/validation/time";
import { readInvestigationStream } from "@/lib/sse/investigation-stream";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/resource-state";
import { StatusBadge, Time } from "@/components/shared/presentation";
import { WorkspaceNavigation, WorkspaceBreadcrumbs } from "@/components/layout/workspace-navigation";
import { EnvironmentBanner } from "@/components/shared/environment-banner";
import type { Anchor, Investigation } from "@/types/investigation";

vi.mock("next/navigation", () => ({ usePathname: () => "/patients/SYN-CONTROL" }));
const anchor: Anchor = { source: { type: "document", id: "DOC-CONTROL" }, source_version: 1, source_hash: "a".repeat(64), encounter_id: null, field: "text_content", expected: "😀 exact quote", quote: "exact", char_start: 2, char_end: 7, relationship: "supports" };
const state: Investigation = { id: "INV-CONTROL", patient_id: "SYN-CONTROL", case_id: "CONTROL", objective: "full_record_investigation", status: "completed", version: 1, created_at: "2026-01-01T00:00:00Z", started_at: null, completed_at: null, progress: { current_stage: "completed", percent: 100, completed_stages: 6, total_stages: 6 }, agents: [], finding_summary: {}, timeline: [], hypotheses: [], limitations: [] };
const event = { id: "E", investigation_id: state.id, type: "future.event", sequence: 1, timestamp: state.created_at, payload: {} };
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); window.history.replaceState(null, "", "/"); });

it("marks only the exact Unicode code-point span supplied by the backend", () => {
  render(<SourceHighlight value={anchor.expected} anchor={anchor} />);
  expect(document.querySelector("mark")).toHaveTextContent("exact");
  expect(document.body).toHaveTextContent("😀 exact quote");
});
it("shows changed spans as unavailable and retains field-level fallback", () => {
  const view = render(<SourceHighlight value="Changed text" anchor={anchor} />);
  expect(screen.getByRole("alert")).toHaveTextContent("unavailable");
  expect(document.querySelector("mark")).toBeNull();
  view.rerender(<SourceHighlight value="Source field" anchor={{ ...anchor, char_start: null, char_end: null }} />);
  expect(document.querySelector("mark")).toHaveTextContent("Source field");
});
it("preserves optional offsets and hypothesis uncertainty without requiring them", () => {
  const hypothesis = { explanation: "Possible documentation delay", verdict: "inconclusive", supports: [anchor], weakens: [], missing_evidence: ["Amendment history"], alternatives: ["Clock discrepancy"], limitations: ["Uncertain event time"] };
  const parsed = parseState({ ...state, hypotheses: [hypothesis] });
  expect(parsed.hypotheses[0].supports[0].char_end).toBe(7);
  render(<Hypotheses items={parsed.hypotheses} onOpen={vi.fn()} />);
  expect(screen.getByText("Alternative: Clock discrepancy")).toBeVisible();
  expect(screen.getByText("Limitation: Uncertain event time")).toBeVisible();
  expect(parseState(state)).toEqual(state);
  expect(() => parseState({ ...state, hypotheses: [{ ...hypothesis, alternatives: [3] }] })).toThrow();
});
it.each([{ char_start: 1 }, { char_start: -1, char_end: 4 }, { char_start: 4, char_end: 2 }])("rejects malformed paired offsets %j", offsets => {
  const { char_start: _start, char_end: _end, ...legacy } = anchor;
  void _start; void _end;
  expect(() => parseFinding({ id: "F", investigation_id: state.id, type: "clinical_relationship", status: "unresolved", title: "Finding", claim: "Claim", claim_kind: "interpretation", support_level: "limited", anchors: [{ ...legacy, ...offsets }], alternatives: [], limitations: [], verification: { status: "inconclusive", classification: "AMBIGUOUS", checks: [] } })).toThrow("offsets");
});
it.each(["2026-02-30", "2026-01-01T12:00:00", "not-a-date"])("rejects invalid or timezone-free timestamps %s", value => {
  expect(() => validateTime(value, true)).toThrow();
});
it("preserves date precision and timezone literals", () => {
  expect(() => validateTime("2026-01-01", true)).not.toThrow();
  expect(() => validateTime("2026-01-01T09:00:00+03:00")).not.toThrow();
  render(<Time value="2026-01-01" />);
  expect(document.querySelector("time")).toHaveAttribute("datetime", "2026-01-01");
});
it("uses one event validator for REST and SSE and rejects foreign runs", () => {
  expect(parseEvent(event, state.id).type).toBe("future.event");
  expect(() => parseEvent(event, "OTHER")).toThrow("identity");
  expect(() => parseEvent({ ...event, payload: [] }, state.id)).toThrow();
});
it("handles CRLF separators split between transport chunks", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
  const chunks = [`data: ${JSON.stringify(event)}\r`, "\n\r", "\n"];
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new ReadableStream({ start(controller) { chunks.forEach(chunk => controller.enqueue(new TextEncoder().encode(chunk))); controller.close(); } }))));
  const receive = vi.fn();
  await readInvestigationStream(state.id, 0, new AbortController().signal, receive);
  expect(receive).toHaveBeenCalledExactlyOnceWith(event);
});
it("rejects malformed stream data as a permanent validation error", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("data: invalid\n\n")));
  await expect(readInvestigationStream(state.id, 0, new AbortController().signal, vi.fn())).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
});
it("does not reconnect indefinitely on a missing investigation", async () => {
  vi.useFakeTimers();
  const get = vi.spyOn(investigationsApi, "get").mockRejectedValue(new ApiRequestError("Investigation not found", "NOT_FOUND", 404));
  vi.spyOn(investigationsApi, "findings").mockResolvedValue({ items: [], total: 0 });
  const { result } = renderHook(() => useInvestigation("MISSING"));
  await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
  expect(get).toHaveBeenCalledTimes(1);
  expect(result.current.connection).toContain("Disconnected");
});
it("bounds transient reconnect attempts and cleans timers on unmount", async () => {
  vi.useFakeTimers();
  const get = vi.spyOn(investigationsApi, "get").mockRejectedValue(new ApiRequestError("Offline", "NETWORK_ERROR"));
  vi.spyOn(investigationsApi, "findings").mockResolvedValue({ items: [], total: 0 });
  const view = renderHook(() => useInvestigation("OFFLINE"));
  await act(async () => { await vi.advanceTimersByTimeAsync(200000); });
  expect(get).toHaveBeenCalledTimes(6);
  expect(view.result.current.connection).toContain("Disconnected");
  view.unmount();
  get.mockClear();
  const next = renderHook(() => useInvestigation("UNMOUNT"));
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  next.unmount();
  await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
  expect(get).toHaveBeenCalledTimes(1);
});
it("does not show an old run after changing investigation identity", async () => {
  vi.spyOn(investigationsApi, "get").mockResolvedValueOnce(state).mockImplementation(() => new Promise(() => undefined));
  vi.spyOn(investigationsApi, "findings").mockResolvedValue({ items: [], total: 0 });
  vi.spyOn(investigationsApi, "events").mockResolvedValue({ items: [], total: 0 });
  const view = renderHook(({ id }) => useInvestigation(id), { initialProps: { id: state.id } });
  await waitFor(() => expect(view.result.current.state?.id).toBe(state.id));
  view.rerender({ id: "OTHER" });
  expect(view.result.current.state).toBeUndefined();
  expect(view.result.current.events).toEqual([]);
  expect(view.result.current.findings).toEqual([]);
});
it("aborts old reads and prevents stale results across patient identities", async () => {
  let complete: ((value: string) => void) | undefined;
  const old = vi.fn((signal: AbortSignal) => { void signal; return new Promise<string>(resolve => { complete = resolve; }); });
  const fresh = vi.fn(async () => "Current patient");
  const view = renderHook(({ id, load }) => useResource(id, load), { initialProps: { id: "OLD", load: old as (signal: AbortSignal) => Promise<string> } });
  view.rerender({ id: "NEW", load: fresh });
  expect(old.mock.calls[0][0].aborted).toBe(true);
  await waitFor(() => expect(view.result.current.data).toBe("Current patient"));
  await act(async () => complete?.("Old patient"));
  expect(view.result.current.data).toBe("Current patient");
  view.unmount();
});
it("restores encoded evidence URLs and preserves unrelated URL and history state", () => {
  window.history.replaceState({ next: "preserve" }, "", "/investigations/INV-CONTROL?filter=verified");
  const { result } = renderHook(() => useEvidenceSelection());
  act(() => result.current[1]([{ source: { type: "document", id: "DOC / #" }, anchor }]));
  expect(new URL(location.href).searchParams.get("source")).toBe("DOC / #");
  expect(window.history.state).toEqual({ next: "preserve" });
  expect(location.search).not.toContain("exact");
  window.history.replaceState(window.history.state, "", "?source=OTHER&source_type=observation");
  act(() => window.dispatchEvent(new PopStateEvent("popstate")));
  expect(result.current[0][0].source.id).toBe("OTHER");
  act(() => result.current[1]([]));
  expect(new URL(location.href).searchParams.has("source")).toBe(false);
});
it("distinguishes request cancellation from connectivity failures", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
  const controller = new AbortController(); controller.abort();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")));
  await expect(request("/test", value => value, controller.signal)).rejects.toMatchObject({ code: "CANCELLED" });
});
it("exposes truthful navigation, active location, environment and accessible states", () => {
  const retry = vi.fn();
  render(<><WorkspaceNavigation /><WorkspaceBreadcrumbs /><EnvironmentBanner /><LoadingState>Loading source</LoadingState><EmptyState>No records available</EmptyState><ErrorState onRetry={retry}>Source unavailable</ErrorState><StatusBadge status="completed_with_limitations" /></>);
  expect(screen.getByRole("link", { name: "Patient records" })).toHaveAttribute("aria-current", "page");
  expect(screen.queryByRole("link", { name: "Case library" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Expand navigation" }));
  expect(screen.getByRole("button", { name: "Collapse navigation" })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText("SYNTHETIC DATA — DEMONSTRATION ENVIRONMENT")).toBeVisible();
  expect(screen.getByRole("status")).toHaveTextContent("Loading source");
  expect(screen.getByText("No records available")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Retry" })); expect(retry).toHaveBeenCalledOnce();
  expect(screen.getByText("completed with limitations")).toBeVisible();
});
