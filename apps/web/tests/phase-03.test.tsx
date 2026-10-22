import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Overview } from "@/features/dashboard/components/overview";
import { CaseLibrary, CaseDetail } from "@/features/cases/components/case-library";
import { catalogApi } from "@/lib/api/catalog";
import { hospitalApi } from "@/lib/api/hospital";
import type { CaseOverview } from "@/types/hospital";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const page = <T,>(data: T[], total = data.length) => ({
  data,
  pagination: { limit: 20, offset: 0, total, has_more: false },
  meta: { request_id: "req" },
});

const importedCase = (id: string): CaseOverview => ({
  case_id: id,
  version: "1",
  patient_id: `PAT-${id}`,
  display_name: `Patient for ${id}`,
  status: "imported",
  imported: true,
  dataset_status: "ready",
  counts: { encounters: 3, documents: 5 },
  modalities: ["laboratory", "medications"],
  latest_encounter_at: "2026-10-01",
});

const notPresentCase: CaseOverview = {
  case_id: "CASE-ABSENT",
  version: null,
  patient_id: null,
  display_name: null,
  status: "not_present",
  imported: false,
  dataset_status: null,
  counts: { encounters: 0, documents: 0 },
  modalities: [],
  latest_encounter_at: null,
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

describe("Overview dashboard", () => {
  function setupOverview(cases: CaseOverview[], active = 0, completed = 0) {
    vi.spyOn(catalogApi, "cases").mockResolvedValue(page(cases));
    vi.spyOn(hospitalApi, "patients").mockResolvedValue(page([]));
    vi.spyOn(catalogApi, "history").mockImplementation(async (filters) => ({
      items: [],
      total:
        filters?.status === "running" ? active :
        filters?.status === "queued" ? 0 :
        filters?.status === "completed" ? completed :
        0,
      limit: 1,
      offset: 0,
    }));
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", version: "1", database: "connected" }))
    ));
  }

  it("primary CTA navigates to /investigations/new, not /patients", async () => {
    setupOverview([importedCase("CASE-001")]);
    render(<Overview />);
    const cta = screen.getByRole("link", { name: "Start Investigation" });
    expect(cta).toHaveAttribute("href", "/investigations/new");
  });

  it("shows correct active and completed investigation counts", async () => {
    setupOverview([importedCase("CASE-001")], 3, 7);
    render(<Overview />);
    await waitFor(() =>
      expect(screen.getByText("Active investigations").parentElement).toHaveTextContent("3")
    );
    expect(screen.getByText("Completed investigations").parentElement).toHaveTextContent("7");
  });

  it("prefers CASE-001 as featured case when imported", async () => {
    setupOverview([importedCase("CASE-002"), importedCase("CASE-001")]);
    render(<Overview />);
    await waitFor(() =>
      expect(screen.getByRole("article", { name: /Featured case CASE-001/ })).toBeInTheDocument()
    );
  });

  it("falls back to first imported case when CASE-001 is absent", async () => {
    setupOverview([importedCase("CASE-003"), importedCase("CASE-004")]);
    render(<Overview />);
    await waitFor(() =>
      expect(screen.getByRole("article", { name: /Featured case CASE-003/ })).toBeInTheDocument()
    );
  });

  it("shows empty state when no imported cases are available", async () => {
    setupOverview([notPresentCase]);
    render(<Overview />);
    await waitFor(() =>
      expect(screen.getByText(/No imported cases available/)).toBeVisible()
    );
  });

  it("shows skeleton while loading, not fabricated data", () => {
    vi.spyOn(catalogApi, "cases").mockImplementation(() => new Promise(() => {}));
    vi.spyOn(catalogApi, "history").mockImplementation(() => new Promise(() => {}));
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise(() => {})));
    render(<Overview />);
    expect(screen.getAllByRole("status", { name: "Loading metrics" })).toHaveLength(1);
  });

  it("shows error state with retry when API fails", async () => {
    vi.spyOn(catalogApi, "cases").mockRejectedValue(new Error("Hospital offline"));
    vi.spyOn(catalogApi, "history").mockRejectedValue(new Error("Hospital offline"));
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", version: "1", database: "connected" }))
    ));
    render(<Overview />);
    const alerts = await screen.findAllByRole("alert");
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0]).toBeVisible();
  });

  it("does not show derived encounter/document counts when has_more is true", async () => {
    vi.spyOn(catalogApi, "cases").mockResolvedValue({
      data: [importedCase("CASE-001")],
      pagination: { limit: 20, offset: 0, total: 50, has_more: true },
      meta: { request_id: "req" },
    });
    vi.spyOn(hospitalApi, "patients").mockResolvedValue(page([]));
    vi.spyOn(catalogApi, "history").mockResolvedValue({ items: [], total: 0, limit: 1, offset: 0 });
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", version: "1", database: "connected" }))
    ));
    render(<Overview />);
    await waitFor(() =>
      expect(screen.getByText("Available cases").parentElement).toHaveTextContent("50")
    );
    expect(screen.queryByText("Available-case encounters")).not.toBeInTheDocument();
    expect(screen.queryByText("Available-case documents")).not.toBeInTheDocument();
  });
});

// ─── Case library ─────────────────────────────────────────────────────────────

describe("CaseLibrary", () => {
  it("renders imported and not-present cases with correct status badges", async () => {
    vi.spyOn(catalogApi, "cases").mockResolvedValue(
      page([importedCase("CASE-001"), notPresentCase])
    );
    render(<CaseLibrary />);
    await screen.findByText("CASE-001");
    expect(screen.getByText("CASE-ABSENT")).toBeInTheDocument();
    expect(screen.getAllByText("imported")).toHaveLength(1);
    expect(screen.getByText("not present")).toBeInTheDocument();
  });

  it("enables investigation only for imported cases with a patient", async () => {
    vi.spyOn(catalogApi, "cases").mockResolvedValue(
      page([importedCase("CASE-001"), notPresentCase])
    );
    render(<CaseLibrary />);
    await screen.findByText("CASE-001");
    expect(screen.getAllByRole("button", { name: "Start investigation" })).toHaveLength(1);
  });

  it("shows patient chart link without requiring display name", async () => {
    const noName: CaseOverview = {
      ...importedCase("CASE-002"),
      display_name: null,
    };
    vi.spyOn(catalogApi, "cases").mockResolvedValue(page([noName]));
    render(<CaseLibrary />);
    await screen.findByText("CASE-002");
    expect(screen.getByRole("link", { name: "Open patient chart" }))
      .toHaveAttribute("href", "/patients/PAT-CASE-002");
  });

  it("applies status filter immediately and resets offset to 0", async () => {
    const spy = vi.spyOn(catalogApi, "cases").mockResolvedValue(page([]));
    render(<CaseLibrary />);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText("Availability"), { target: { value: "invalid" } });
    await waitFor(() =>
      expect(spy).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "invalid", offset: "0" }),
        expect.any(AbortSignal)
      )
    );
  });

  it("submits exact case ID search on form submit and resets offset", async () => {
    const spy = vi.spyOn(catalogApi, "cases").mockResolvedValue(page([]));
    render(<CaseLibrary />);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText("Case identifier"), { target: { value: "CASE-001" } });
    fireEvent.click(screen.getByRole("button", { name: "Search cases" }));
    await waitFor(() =>
      expect(spy).toHaveBeenLastCalledWith(
        expect.objectContaining({ case_id: "CASE-001", offset: "0" }),
        expect.any(AbortSignal)
      )
    );
  });

  it("clear filters resets both controls and re-fetches without filters", async () => {
    const spy = vi.spyOn(catalogApi, "cases").mockResolvedValue(page([]));
    render(<CaseLibrary />);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText("Availability"), { target: { value: "imported" } });
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() =>
      expect(spy).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: "0" }),
        expect.any(AbortSignal)
      )
    );
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1][0];
    expect(lastCall).not.toHaveProperty("status");
    expect(lastCall).not.toHaveProperty("case_id");
  });

  it("shows pagination range and disables controls correctly", async () => {
    vi.spyOn(catalogApi, "cases").mockResolvedValue({
      data: [importedCase("CASE-001")],
      pagination: { limit: 20, offset: 0, total: 1, has_more: false },
      meta: { request_id: "req" },
    });
    render(<CaseLibrary />);
    await screen.findByText("CASE-001");
    expect(screen.getByText(/Showing 1–1 of 1 case/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Previous cases" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next cases" })).toBeDisabled();
  });

  it("shows filtered empty state when filters are active", async () => {
    vi.spyOn(catalogApi, "cases").mockResolvedValue(page([]));
    render(<CaseLibrary />);
    fireEvent.change(screen.getByLabelText("Availability"), { target: { value: "invalid" } });
    expect(await screen.findByText(/No cases match the current filters/)).toBeVisible();
  });

  it("shows generic empty state when no filters are active", async () => {
    vi.spyOn(catalogApi, "cases").mockResolvedValue(page([]));
    render(<CaseLibrary />);
    expect(await screen.findByText(/No cases available/)).toBeVisible();
  });

  it("shows error state with retry on API failure", async () => {
    vi.spyOn(catalogApi, "cases")
      .mockRejectedValueOnce(new Error("Cases unavailable"))
      .mockResolvedValue(page([]));
    render(<CaseLibrary />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Cases unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText(/No cases available/)).toBeVisible();
  });

  it("formats latest_encounter_at as human-readable date", async () => {
    vi.spyOn(catalogApi, "cases").mockResolvedValue(
      page([{ ...importedCase("CASE-001"), latest_encounter_at: "2026-10-01" }])
    );
    render(<CaseLibrary />);
    await screen.findByText("CASE-001");
    expect(screen.getByText(/Last documented encounter/)).toBeInTheDocument();
    // Should not show raw ISO string
    expect(screen.queryByText("2026-10-01")).not.toBeInTheDocument();
  });

  it("shows modality badges from actual data", async () => {
    vi.spyOn(catalogApi, "cases").mockResolvedValue(
      page([{ ...importedCase("CASE-001"), modalities: ["laboratory", "medications"] }])
    );
    render(<CaseLibrary />);
    await screen.findByText("CASE-001");
    expect(screen.getByText("Labs")).toBeVisible();
    expect(screen.getByText("Medications")).toBeVisible();
  });
});

// ─── Case detail ──────────────────────────────────────────────────────────────

describe("CaseDetail", () => {
  it("renders case identity and record inventory", async () => {
    vi.spyOn(catalogApi, "case").mockResolvedValue(importedCase("CASE-001"));
    render(<CaseDetail caseId="CASE-001" />);
    expect(await screen.findByRole("heading", { name: "CASE-001" })).toBeVisible();
    expect(screen.getByText("Record inventory")).toBeInTheDocument();
    expect(screen.getAllByText(/encounters/).length).toBeGreaterThan(0);
  });

  it("shows warning for non-imported case", async () => {
    vi.spyOn(catalogApi, "case").mockResolvedValue(notPresentCase);
    render(<CaseDetail caseId="CASE-ABSENT" />);
    await screen.findByText("CASE-ABSENT");
    // The CaseDetail-level WarningNotice is the authoritative import warning
    expect(screen.getByText(/not been imported into the hospital system/)).toBeVisible();
  });

  it("does not show investigation launch for unavailable case", async () => {
    vi.spyOn(catalogApi, "case").mockResolvedValue({
      ...notPresentCase,
      case_id: "CASE-ABSENT",
    });
    render(<CaseDetail caseId="CASE-ABSENT" />);
    await screen.findByText("CASE-ABSENT");
    expect(screen.queryByRole("button", { name: "Start investigation" })).not.toBeInTheDocument();
  });

  it("shows error state with retry on API failure", async () => {
    vi.spyOn(catalogApi, "case")
      .mockRejectedValueOnce(new Error("Case not found"))
      .mockResolvedValue(importedCase("CASE-001"));
    render(<CaseDetail caseId="CASE-001" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Case not found");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "CASE-001" })).toBeVisible();
  });

  it("does not show latest encounter when absent", async () => {
    vi.spyOn(catalogApi, "case").mockResolvedValue({
      ...importedCase("CASE-001"),
      latest_encounter_at: null,
    });
    render(<CaseDetail caseId="CASE-001" />);
    await screen.findByRole("heading", { name: "CASE-001" });
    expect(screen.queryByText(/Last documented encounter/)).not.toBeInTheDocument();
  });
});
