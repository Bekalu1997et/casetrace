import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { InvestigationDirectory } from "@/features/investigations/components/directory";
import { NewInvestigation } from "@/features/investigations/components/new-investigation";
import { WorkflowRail } from "@/features/investigations/components/workflow";
import { TaskActivity } from "@/features/investigations/components/task-activity";
import { parseToolPage, toolAuditApi } from "@/lib/api/tool-audit";
import { ToolInspector } from "@/features/investigations/components/tool-inspector";
import { catalogApi } from "@/lib/api/catalog";
import { hospitalApi } from "@/lib/api/hospital";
import type { InvestigationEvent } from "@/types/investigation";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(() => { vi.restoreAllMocks(); });
const event = (type: string, payload: Record<string, unknown>, sequence = 1): InvestigationEvent => ({ id: `E-${sequence}`, investigation_id: "INV-TEST", sequence, type, payload, timestamp: "2026-01-01T00:00:00Z" });
const item = { id: "INV-TEST", patient_id: "PAT-TEST", case_id: "CASE-TEST", objective: "timeline_investigation", status: "completed", created_at: "2026-01-01T00:00:00Z", started_at: null, completed_at: null, current_stage: "synthesis" };

it("directory applies actual backend filters, paging and completed report links", async () => {
  const history = vi.spyOn(catalogApi, "history").mockResolvedValue({ items: [item], total: 22, limit: 20, offset: 0 });
  render(<InvestigationDirectory />);
  expect(await screen.findByRole("link", { name: "Open report" })).toHaveAttribute("href", "/investigations/INV-TEST/report");
  fireEvent.click(screen.getByRole("button", { name: "Next investigations" }));
  await waitFor(() => expect(history).toHaveBeenLastCalledWith(expect.objectContaining({ offset: "20" }), expect.any(AbortSignal)));
  fireEvent.change(screen.getByLabelText("Investigation status"), { target: { value: "failed" } });
  await waitFor(() => expect(history).toHaveBeenLastCalledWith(expect.objectContaining({ offset: "0", status: "failed" }), expect.any(AbortSignal)));
});
it("directory distinguishes empty results and API errors", async () => {
  vi.spyOn(catalogApi, "history").mockResolvedValueOnce({ items: [], total: 0, limit: 20, offset: 0 }).mockRejectedValueOnce(new Error("API unavailable"));
  render(<InvestigationDirectory />);
  expect(await screen.findByText(/No investigations match/)).toBeVisible();
  fireEvent.change(screen.getByLabelText("Case identifier"), { target: { value: "MISSING" } });
  expect(await screen.findByRole("alert")).toHaveTextContent("API unavailable");
});
it("launch selects a real imported patient and reads record inventory", async () => {
  vi.spyOn(hospitalApi, "patients").mockResolvedValue({ data: [{ id: "PAT-TEST", case_id: "CASE-TEST", display_name: "Synthetic control", synthetic_identifier: "PAT-TEST", date_of_birth: "1990-01-01", sex: "unknown", created_at: "2026-01-01T00:00:00Z" }], pagination: { total: 1, limit: 20, offset: 0, has_more: false }, meta: { request_id: "TEST" } });
  vi.spyOn(catalogApi, "summary").mockResolvedValue({ patient_id: "PAT-TEST", encounter_count: 2, document_count: 3, observation_count: 0, medication_count: 0, imaging_study_count: 0, latest_encounter_at: null });
  render(<NewInvestigation />);
  fireEvent.click(await screen.findByRole("button", { name: "Select PAT-TEST" }));
  expect(await screen.findByRole("button", { name: "Start investigation" })).toBeVisible();
  expect(screen.getByRole("status")).toHaveTextContent("PAT-TEST");
});
it("workflow uses recorded outcomes and never fills unexecuted stages", () => {
  render(<WorkflowRail events={[event("stage.started", { stage: "record_discovery" }), event("stage.failed", { stage: "record_discovery" }, 2)]} />);
  expect(screen.getByText("failed", { exact: true })).toBeVisible();
  expect(screen.queryByText("synthesis")).not.toBeInTheDocument();
});
it("tasks retain parent handoffs while deduplicating repeated lead events", () => {
  const open = vi.fn();
  render(<TaskActivity onOpen={open} events={[event("lead.identified", { id: "LEAD-1", question: "Review chronology", source_agent: "timeline" }), event("lead.rejected", { id: "LEAD-1", decision: "DUPLICATE_LEAD" }, 2), event("task.completed", { id: "TASK-2", objective: "Retrieve source", parent_task: "TASK-1", result_refs: [{ type: "document", id: "DOC-1" }] }, 3)]} />);
  expect(screen.getAllByText("Review chronology")).toHaveLength(1);
  fireEvent.click(screen.getByText("Retrieve source"));
  expect(screen.getByText("TASK-1")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "DOC-1" }));
  expect(open).toHaveBeenCalledWith({ type: "document", id: "DOC-1" });
});
const tool = { id: "CALL-1", agent_run_id: "RUN-1", agent: "timeline", attempt: 2, tool: "get_document", status: "failed", arguments: { patient_id: "PAT-TEST" }, source_refs: [], started_at: "2026-01-01T00:00:00Z", completed_at: "2026-01-01T00:00:01Z", duration_ms: 1000, error_code: "TOOL_TIMEOUT" };
it("audit parser enforces run identity and rejects nested parameters", () => {
  const page = { investigation_id: "INV-TEST", items: [tool], total: 1, limit: 20, offset: 0 };
  expect(parseToolPage(page, "INV-TEST").items[0].attempt).toBe(2);
  expect(() => parseToolPage(page, "INV-OTHER")).toThrow(/identity/);
  expect(() => parseToolPage({ ...page, items: [{ ...tool, arguments: { unsafe: {} } }] }, "INV-TEST")).toThrow(/parameters/);
});
it("tool inspector shows failed attempts, real duration and honest payload limits", async () => {
  vi.spyOn(toolAuditApi, "list").mockResolvedValue({ items: [tool], total: 1, limit: 20, offset: 0 });
  render(<ToolInspector id="INV-TEST" revision={1} onOpen={vi.fn()} />);
  fireEvent.click(await screen.findByText(/attempt 2/));
  expect(screen.getByText("1000 ms")).toBeVisible();
  expect(screen.getByRole("alert")).toHaveTextContent("TOOL_TIMEOUT");
  expect(screen.getByText(/Full result payload unavailable/)).toBeVisible();
});
