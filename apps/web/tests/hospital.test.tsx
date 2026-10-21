import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PatientDirectory } from "@/components/patients/patient-directory";
import { PatientRecord } from "@/components/patients/patient-record";
import { RecordCard } from "@/components/patients/record-card";
import { DocumentAsset } from "@/components/documents/document-asset";
import { hospitalApi, parseCollection, parsePatient } from "@/lib/api/hospital";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const patient = { id: "PAT-CONTROL", case_id: "CONTROL-001", synthetic_identifier: "MRN-SYN-CONTROL", display_name: "Synthetic Pipeline Control", date_of_birth: "1990-01-01", sex: "unknown", created_at: "2026-01-01T00:00:00Z" };
const envelope = <T,>(data: T[], total = data.length) => ({ data, pagination: { limit: 20, offset: 0, total, has_more: false }, meta: { request_id: "req_control" } });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("hospital patient records", () => {
  it("renders the real patient collection and source identifiers", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(envelope([patient]))));
    vi.stubGlobal("fetch", fetchMock);
    render(<PatientDirectory />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading patients");
    expect(await screen.findByRole("link", { name: patient.display_name })).toHaveAttribute("href", "/patients/PAT-CONTROL");
    expect(fetchMock.mock.calls[0][0]).toContain("/api/hospital/v1/patients?offset=0");
  });
  it("shows an empty directory without creating CASE-001 records", async () => {
    vi.spyOn(hospitalApi, "patients").mockResolvedValue(envelope([]));
    render(<PatientDirectory />);
    expect(await screen.findByText(/No synthetic patients imported/)).toBeVisible();
  });
  it("reports API failure and retries an idempotent read", async () => {
    vi.spyOn(hospitalApi, "patients").mockRejectedValueOnce(new Error("Hospital unavailable")).mockResolvedValue(envelope([]));
    render(<PatientDirectory />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Hospital unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText(/No synthetic patients imported/)).toBeVisible();
  });
  it("loads sections from the patient-scoped hospital API", async () => {
    vi.spyOn(hospitalApi, "patient").mockResolvedValue(patient);
    const records = vi.spyOn(hospitalApi, "records").mockResolvedValue(envelope([]));
    render(<PatientRecord patientId={patient.id} />);
    expect(await screen.findByRole("heading", { name: patient.display_name })).toBeVisible();
    expect(await screen.findByText(/No encounters records/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Laboratory" }));
    expect(await screen.findByText(/No observations records/)).toBeVisible();
    expect(records).toHaveBeenLastCalledWith(patient.id, "observations", 0, expect.any(AbortSignal));
  });
  it("does not render the old patient while a different patient loads", async () => {
    vi.spyOn(hospitalApi, "patient").mockResolvedValueOnce(patient).mockImplementation(() => new Promise(() => {}));
    vi.spyOn(hospitalApi, "records").mockResolvedValue(envelope([]));
    const { rerender } = render(<PatientRecord patientId={patient.id} />);
    await screen.findByRole("heading", { name: patient.display_name });
    rerender(<PatientRecord patientId="PAT-OTHER" />);
    expect(screen.queryByText(patient.display_name)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading patient");
  });
  it("preserves zero measurements, reference ranges and separate source timestamps", () => {
    render(<RecordCard section="observations" record={{ id: "LAB-CONTROL", patient_id: patient.id, test_name: "Synthetic measurement", value_numeric: 0, value_text: null, unit: "synthetic units", reference_range_low: 0, reference_range_high: 1, specimen_collected_at: "2026-01-01T10:00:00+03:00", reported_at: "2026-01-02T10:00:00+03:00", status: "final" }} />);
    expect(screen.getAllByText("0")).toHaveLength(2);
    expect(screen.getByText("2026-01-01T10:00:00+03:00")).toBeVisible();
    expect(screen.getByText("2026-01-02T10:00:00+03:00")).toBeVisible();
  });
  it("reports a missing registered document asset", async () => {
    vi.spyOn(hospitalApi, "documentAsset").mockRejectedValue(new Error("Document asset is unavailable."));
    render(<DocumentAsset documentId="DOC-CONTROL" mimeType="application/pdf" />);
    fireEvent.click(screen.getByRole("button", { name: "Open original asset" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Document asset is unavailable");
  });
  it("labels unregistered assets and absent note text", () => {
    render(<RecordCard section="documents" record={{ id: "DOC-CONTROL", patient_id: patient.id, title: "Synthetic note", document_type: "progress_note", has_asset: false, mime_type: "text/plain", text_content: null }} />);
    expect(screen.getByText("No document asset registered.")).toBeVisible();
    expect(screen.getByText("No extracted note text available.")).toBeVisible();
  });
  it("validates hospital response envelopes and clinical values", async () => {
    expect(() => parseCollection({ data: [] }, parsePatient)).toThrow("Invalid hospital response");
    expect(() => parsePatient({ ...patient, date_of_birth: 1990 })).toThrow("Invalid hospital record");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(envelope([{ id: "LAB-X", patient_id: patient.id, test_name: "Invalid measurement", value_numeric: "seven", status: "final" }])))));
    await expect(hospitalApi.records(patient.id, "observations")).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
  it("preserves hospital request IDs on API errors", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "RESOURCE_NOT_FOUND", message: "Missing" }, meta: { request_id: "req_hospital" } }), { status: 404 })));
    await expect(hospitalApi.patient("missing")).rejects.toMatchObject({ code: "RESOURCE_NOT_FOUND", requestId: "req_hospital" });
  });
});

