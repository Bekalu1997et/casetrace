import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { StartInvestigation } from "@/features/investigations/components/start-investigation";
import { SourcePanel } from "@/features/evidence/components/source-panel";
import { comparisonSources } from "@/features/evidence/navigation";
import { FindingCard } from "@/features/investigations/components/finding-card";
import { InvestigationTimeline, orderedTimeline } from "@/features/timeline/components/investigation-timeline";
import { InvestigationWorkspace } from "@/features/investigations/components/workspace";
import { InvestigationReportView } from "@/features/investigations/components/report";
import { AgentActivity } from "@/features/investigations/components/agent-activity";
import { Hypotheses } from "@/features/investigations/components/hypotheses";
import { investigationsApi } from "@/lib/api/investigations";
import { hospitalApi, resolveImagingAsset } from "@/lib/api/hospital";
import { mergeEvents, readInvestigationStream } from "@/lib/sse/investigation-stream";
import type { Anchor, Finding, Investigation, InvestigationEvent, TimelineEvent } from "@/types/investigation";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const anchor: Anchor = { source: { type: "clinical_event", id: "EVT-CONTROL" }, source_version: 1, source_hash: "abc", encounter_id: "ENC-CONTROL", field: "description", expected: "Recorded observation", quote: "Recorded observation", relationship: "supports" };
const finding: Finding = { id: "F-CONTROL", investigation_id: "INV-CONTROL", type: "timeline_contradiction", title: "Source comparison", claim: "A recorded discrepancy", claim_kind: "chronology", status: "verified", support_level: "strong", anchors: [anchor], alternatives: ["Documentation delay"], limitations: ["No causal inference"], verification: { status: "verified", classification: "VERIFIED_CONTRADICTION", checks: [{ type: "source_existence", status: "passed", message: "Source exists" }] } };
const event = (sequence: number, type = "future.event"): InvestigationEvent => ({ id: `E-${sequence}`, investigation_id: "INV-CONTROL", sequence, type, timestamp: "2026-01-01T00:00:00Z", payload: {} });
const point = (id: string, timestamp: string | null): TimelineEvent => ({ id, source: { type: "clinical_event", id }, timestamp, timestamp_type: "occurred_at", precision: timestamp?.length === 10 ? "day" : timestamp ? "instant" : "unknown", timestamps: { occurred_at: timestamp }, title: id });
const state: Investigation = { id: "INV-CONTROL", patient_id: "SYN-CONTROL", case_id: "CONTROL", objective: "full_record_investigation", status: "completed", version: 10, created_at: "2026-01-01T00:00:00Z", started_at: "2026-01-01T00:00:00Z", completed_at: "2026-01-01T00:00:01Z", progress: { current_stage: "completed", completed_stages: 6, total_stages: 6, percent: 100 }, agents: [{ name: "timeline", status: "completed" }], finding_summary: {}, timeline: [point("EVT-CONTROL", "2026-01-01")], hypotheses: [], limitations: [] };
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); sessionStorage.clear(); push.mockClear(); });

it("guards double submission and reuses the creation key after a network failure", async () => {
  const create = vi.spyOn(investigationsApi, "create").mockRejectedValueOnce(new Error("Network unavailable")).mockResolvedValue({ investigation_id: state.id, status: "queued", patient_id: state.patient_id, created_at: state.created_at });
  render(<StartInvestigation patientId={state.patient_id} caseId={state.case_id} />);
  fireEvent.click(screen.getByRole("button", { name: "Start investigation" }));
  fireEvent.click(screen.getByRole("button", { name: "Begin investigation" }));
  await screen.findByRole("alert");
  const key = create.mock.calls[0][2];
  fireEvent.click(screen.getByRole("button", { name: "Begin investigation" }));
  await waitFor(() => expect(push).toHaveBeenCalledWith(`/investigations/${state.id}`));
  expect(create.mock.calls[1][2]).toBe(key);
  expect(create).toHaveBeenCalledTimes(2);
});

it("renders verification separately and opens the exact anchor", () => {
  const open = vi.fn();
  render(<FindingCard finding={finding} onOpen={open} />);
  expect(screen.getByText("verified", { exact: true })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "EVT-CONTROL · supports" }));
  expect(open).toHaveBeenCalledWith(anchor);
  fireEvent.click(screen.getByText("Verification checks & uncertainty"));
  expect(screen.getByText("Limitation: No causal inference")).toBeVisible();
});

it("retrieves original sources, highlights recorded fields and reports unavailable sources", async () => {
  vi.spyOn(hospitalApi, "source").mockResolvedValueOnce({ id: "EVT-CONTROL", patient_id: "SYN-CONTROL", description: "Recorded observation", event_type: "symptom", occurred_at: "2026-01-01", documented_at: "2026-01-02" }).mockRejectedValueOnce(new Error("Missing source"));
  const view = render(<SourcePanel patientId="SYN-CONTROL" source={anchor.source} anchor={anchor} />);
  expect(await screen.findByText("Cited field: description")).toBeVisible();
  expect(document.querySelector("mark")).toHaveTextContent("Recorded observation");
  view.rerender(<SourcePanel patientId="SYN-OTHER" source={{ type: "document", id: "DOC-MISSING" }} />);
  expect(screen.queryByText("Cited field: description")).not.toBeInTheDocument();
  expect(await screen.findByRole("alert")).toHaveTextContent("Missing source");
});

it("rejects cross-patient sources at the API boundary", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: "EVT-CONTROL", patient_id: "FOREIGN", event_type: "symptom", description: "Foreign" } }))));
  await expect(hospitalApi.source("SYN-CONTROL", "clinical-events", "EVT-CONTROL")).rejects.toMatchObject({ code: "SOURCE_SCOPE_MISMATCH" });
});

it("orders offset timestamps and date-only records, retains missing dates and filters categories", () => {
  const points = [point("unknown", null), point("late", "2026-01-02T09:00:00+03:00"), point("day", "2026-01-01"), { ...point("lab", "2026-01-02T05:00:00Z"), source: { type: "observation", id: "LAB-CONTROL" } }];
  expect(orderedTimeline(points).map(item => item.id)).toEqual(["day", "lab", "late", "unknown"]);
  const open = vi.fn(); render(<InvestigationTimeline events={points} onOpen={open} />);
  fireEvent.change(screen.getByLabelText("Event category"), { target: { value: "observation" } });
  expect(screen.queryByRole("heading", { name: "late" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open source LAB-CONTROL" }));
  expect(open).toHaveBeenCalledWith({ type: "observation", id: "LAB-CONTROL" });
});

it("compares hypotheses without generating a diagnostic probability", () => {
  const open = vi.fn();
  render(<Hypotheses items={[{ explanation: "Possible late entry", verdict: "inconclusive", supports: [anchor], weakens: [], missing_evidence: ["Amendment history"] }]} onOpen={open} />);
  expect(screen.getByText("inconclusive", { exact: true })).toBeVisible();
  expect(screen.getByText("Amendment history")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "EVT-CONTROL" })); expect(open).toHaveBeenCalledWith(anchor);
});

it("deduplicates and orders persisted event replay, retaining unknown event types", () => {
  expect(mergeEvents([event(3), event(1)], [event(2), event(3)])).toEqual([event(1), event(2), event(3)]);
});

it("reads split SSE frames, comments and future event names", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
  const chunks = [": keepalive\n\nevent: future.event\ndata: ", JSON.stringify(event(1)), "\n\n"];
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new ReadableStream({ start(controller) { chunks.forEach(chunk => controller.enqueue(new TextEncoder().encode(chunk))); controller.close(); } }))));
  const receive = vi.fn(); await readInvestigationStream("INV-CONTROL", 0, new AbortController().signal, receive);
  expect(receive).toHaveBeenCalledExactlyOnceWith(event(1));
});

it("restores terminal state and history without reopening a stream", async () => {
  vi.spyOn(investigationsApi, "get").mockResolvedValue(state);
  vi.spyOn(investigationsApi, "findings").mockResolvedValue({ items: [finding], total: 1 });
  vi.spyOn(investigationsApi, "events").mockResolvedValueOnce({ items: [event(1)], total: 1 }).mockResolvedValue({ items: [], total: 0 });
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  render(<InvestigationWorkspace id={state.id} />);
  expect(await screen.findByRole("link", { name: "Open investigation report →" })).toBeVisible();
  expect(await screen.findByText("History restored")).toBeVisible(); expect(fetchMock).not.toHaveBeenCalled();
});

it("shows genuine failed state with persisted partial output", async () => {
  vi.spyOn(investigationsApi, "get").mockResolvedValue({ ...state, status: "failed", limitations: ["Worker interrupted"] });
  vi.spyOn(investigationsApi, "findings").mockResolvedValue({ items: [], total: 0 });
  vi.spyOn(investigationsApi, "events").mockResolvedValue({ items: [], total: 0 });
  render(<InvestigationWorkspace id={state.id} />);
  expect(await screen.findByText(/This investigation failed/)).toBeVisible();
  expect(screen.queryByRole("link", { name: "Open investigation report →" })).not.toBeInTheDocument();
});

it("shows report-not-ready errors and renders the backend report after retry", async () => {
  vi.spyOn(investigationsApi, "get").mockResolvedValue(state);
  vi.spyOn(investigationsApi, "events").mockResolvedValue({ items: [], total: 0 });
  vi.spyOn(investigationsApi, "report").mockRejectedValueOnce(new Error("Report not ready")).mockResolvedValue({ investigation_id: state.id, status: "completed", summary: { headline: "Backend report", description: "Backend summary" }, timeline: [], verified_findings: [finding], rejected_findings: [], unresolved_findings: [], hypotheses: [], limitations: [], generated_at: state.created_at, execution_mode: "rules" });
  render(<InvestigationReportView id={state.id} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Report not ready");
  fireEvent.click(screen.getByRole("button", { name: "Retry report" }));
  expect(await screen.findByRole("heading", { name: "Backend report" })).toBeVisible();
  expect(screen.getByText("Backend summary")).toBeVisible();
});

it("displays safe tool metadata without rendering arbitrary event payloads", () => {
  const row = { ...event(1, "tool.completed"), payload: { tool: "get_lab_results", record_count: 2, secret: "DO_NOT_RENDER" } };
  render(<AgentActivity agents={state.agents} events={[row]} onOpen={vi.fn()} />);
  fireEvent.click(screen.getByText(/tool · completed/));
  expect(screen.getByText("2")).toBeVisible(); expect(screen.queryByText("DO_NOT_RENDER")).not.toBeInTheDocument();
});

it("reconciles after disconnect and stops reconnecting when REST reports terminal state", async () => {
  const get = vi.spyOn(investigationsApi, "get").mockResolvedValueOnce({ ...state, status: "running" }).mockResolvedValueOnce({ ...state, status: "running" }).mockResolvedValue(state);
  vi.spyOn(investigationsApi, "findings").mockResolvedValue({ items: [], total: 0 });
  vi.spyOn(investigationsApi, "events").mockResolvedValue({ items: [], total: 0 });
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
  const stream = vi.fn().mockResolvedValue(new Response(new ReadableStream({ start(controller) { controller.close(); } })));
  vi.stubGlobal("fetch", stream);
  render(<InvestigationWorkspace id={state.id} />);
  expect(await screen.findByText(/Reconnecting — showing persisted state/)).toBeVisible();
  expect(await screen.findByText("History restored", {}, { timeout: 4000 })).toBeVisible();
  expect(get).toHaveBeenCalledTimes(3); expect(stream).toHaveBeenCalledTimes(1);
});

it("groups comparison fields per original source and retains contextual citations separately", () => {
  const second = { ...anchor, source: { type: "document", id: "DOC-CONTROL" } };
  const context = { ...anchor, source: { type: "document", id: "DOC-CONTEXT" }, relationship: "contextualizes" as const };
  const groups = comparisonSources([anchor, { ...anchor, field: "occurred_at" }, second, context]);
  expect(groups).toHaveLength(2); expect(groups[0].anchors).toHaveLength(2);
  expect(groups.map(group => group.source.id)).toEqual(["EVT-CONTROL", "DOC-CONTROL"]);
});

it("resolves imaging assets only through the selected patient's studies", async () => {
  const pagination = { limit: 20, offset: 0, total: 1, has_more: false };
  vi.spyOn(hospitalApi, "records").mockResolvedValue({ data: [{ id: "IMG-CONTROL", patient_id: "SYN-CONTROL" }], pagination, meta: { request_id: "r" } });
  vi.spyOn(hospitalApi, "imagingAssets").mockResolvedValue({ data: [{ id: "ASSET-CONTROL", imaging_study_id: "IMG-CONTROL", asset_type: "illustration", mime_type: "image/png" }], pagination, meta: { request_id: "r" } });
  expect(await resolveImagingAsset("SYN-CONTROL", "ASSET-CONTROL")).toMatchObject({ id: "ASSET-CONTROL", patient_id: "SYN-CONTROL" });
  await expect(resolveImagingAsset("SYN-CONTROL", "FOREIGN-ASSET")).rejects.toMatchObject({ code: "SOURCE_NOT_FOUND" });
});
