import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { EvidenceExplorer } from "@/features/evidence/components/evidence-explorer";
import { ReportSourceIndex } from "@/features/investigations/components/source-index";
import { AgentActivity } from "@/features/investigations/components/agent-activity";
import { useEvidenceSelection } from "@/features/evidence/hooks/use-evidence-selection";
import type { Anchor, Finding, InvestigationEvent, InvestigationReport } from "@/types/investigation";

const anchor: Anchor = { source: { id: "DOC-CONTROL", type: "document" }, source_version: 1, source_hash: "hash", encounter_id: "ENC-CONTROL", field: "text_content", expected: "A recorded statement", quote: "recorded", char_start: 2, char_end: 10, relationship: "supports" };
const finding: Finding = { id: "F-CONTROL", investigation_id: "INV-CONTROL", title: "Recorded discrepancy", claim: "Two records differ", type: "timeline_contradiction", claim_kind: "chronology", status: "verified", support_level: "strong", anchors: [anchor], alternatives: [], limitations: [], verification: { status: "verified", classification: "VERIFIED_CONTRADICTION", checks: [{ type: "quote", status: "passed", message: "Exact quote matched" }] } };
vi.mock("@/features/investigations/hooks/use-investigation", () => ({ useInvestigation: () => ({ state: { id: "INV-CONTROL", patient_id: "PAT-CONTROL", case_id: "CASE-CONTROL" }, findings: [finding], retry: vi.fn() }) }));
vi.mock("@/features/evidence/components/source-panel", () => ({ SourcePanel: ({ source, anchors }: { source: { id: string }; anchors?: Anchor[] }) => <section aria-label={`Resolved ${source.id}`}>{anchors?.map(item => <p key={item.field}>Restored exact anchor: {item.field} {item.char_start}-{item.char_end}</p>)}</section> }));
afterEach(() => window.history.replaceState({}, "", "/"));

function ComparisonControl() {
  const [sources, select] = useEvidenceSelection();
  return <><button onClick={() => select([{ source: { type: "document", id: "DOC:ONE" } }, { source: { type: "observation", id: "LAB-TWO" } }])}>Compare controls</button><p>Selected sources: {sources.map(item => item.source.id).join(", ")}</p></>;
}
it("comparison restores both opaque source identities after remount", () => {
  const view = render(<ComparisonControl />);
  fireEvent.click(screen.getByRole("button", { name: "Compare controls" }));
  expect(new URL(window.location.href).searchParams.getAll("compare")).toHaveLength(2);
  view.unmount();
  render(<ComparisonControl />);
  expect(screen.getByText("Selected sources: DOC:ONE, LAB-TWO")).toBeVisible();
});

it("evidence direct links restore persisted exact anchors", () => {
  render(<EvidenceExplorer id="INV-CONTROL" initialFinding="F-CONTROL" initialSource={anchor.source} />);
  expect(screen.getByRole("region", { name: "Resolved DOC-CONTROL" })).toBeVisible();
  expect(screen.getByText("Restored exact anchor: text_content 2-10")).toBeVisible();
});
it("refuses a source outside selected finding membership", () => {
  render(<EvidenceExplorer id="INV-CONTROL" initialFinding="F-CONTROL" initialSource={{ type: "document", id: "DOC-OTHER" }} />);
  expect(screen.getByRole("alert")).toHaveTextContent("not evidence for this finding");
  expect(screen.queryByRole("region", { name: "Resolved DOC-OTHER" })).not.toBeInTheDocument();
});
it("does not resolve sources under an unavailable finding", () => {
  render(<EvidenceExplorer id="INV-CONTROL" initialFinding="F-MISSING" initialSource={anchor.source} />);
  expect(screen.queryByRole("region", { name: "Resolved DOC-CONTROL" })).not.toBeInTheDocument();
});
it("finding selection stores only stable identifiers in the URL", () => {
  render(<EvidenceExplorer id="INV-CONTROL" />);
  fireEvent.click(screen.getByRole("button", { name: /verified Recorded discrepancy F-CONTROL/ }));
  expect(new URL(window.location.href).searchParams.get("finding")).toBe("F-CONTROL");
  expect(window.location.href).not.toContain("recorded");
  expect(screen.getByLabelText("Relationship")).toBeVisible();
});
it("report source index deduplicates by type and ID across report sections", () => {
  const report: InvestigationReport = { investigation_id: "INV-CONTROL", status: "completed", summary: { headline: "Persisted report", description: "Persisted summary" }, timeline: [], verified_findings: [finding, finding], unresolved_findings: [], rejected_findings: [], hypotheses: [], limitations: [], generated_at: "2026-01-01T00:00:00Z", execution_mode: "rules" };
  render(<ReportSourceIndex report={report} patientId="PAT-CONTROL" onOpen={vi.fn()} />);
  expect(screen.getAllByRole("button", { name: "DOC-CONTROL" })).toHaveLength(1);
});
it("keeps repeated agent executions and their individual outcomes", () => {
  const event = (sequence: number, type: string, payload: Record<string, unknown>): InvestigationEvent => ({ id: `E-${sequence}`, sequence, investigation_id: "INV-CONTROL", timestamp: "2026-01-01T00:00:00Z", type, payload });
  render(<AgentActivity agents={[{ name: "timeline", status: "completed" }]} events={[event(1, "agent.started", { agent: "timeline", agent_run_id: "RUN-1" }), event(2, "agent.failed", { agent_run_id: "RUN-1", error_code: "TIMEOUT" }), event(3, "agent.started", { agent: "timeline", agent_run_id: "RUN-2" }), event(4, "agent.completed", { agent_run_id: "RUN-2" })]} onOpen={vi.fn()} />);
  expect(screen.getByText(/RUN-1/)).toBeVisible();
  expect(screen.getByText(/RUN-2/)).toBeVisible();
  expect(screen.getByText("failed", { exact: true })).toBeVisible();
});
