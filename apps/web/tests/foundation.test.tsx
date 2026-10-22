import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { AppShell } from "@/components/layout/app-shell";
import { ApiStatus } from "@/components/system/api-status";
import { healthApi, parseHealth } from "@/lib/api/health";

const healthy = { status: "ok", version: "1.0.0", database: "connected" };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("foundation", () => {
  it("renders identity, empty records and real connection result", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(healthy))));
    vi.stubGlobal("fetch", fetchMock);
    render(<AppShell><Home /></AppShell>);
    expect(screen.getByRole("heading", { name: "Hospital Overview" })).toBeVisible();
    expect(screen.getByText("SYNTHETIC DEMO — NOT FOR CLINICAL USE")).toBeVisible();
    expect(screen.getByRole("link", {name: "Browse Cases"})).toHaveAttribute("href", "/cases");
    expect(await screen.findByText("API connected")).toBeVisible();
    expect(fetchMock.mock.calls.some(call => call[0] === "http://localhost:8000/api/health")).toBe(true);
  });

  it("shows failure and supports a successful retry", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Response(JSON.stringify(healthy))));
    render(<ApiStatus />);
    expect(await screen.findByText(/Unable to reach the API/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Check connection" }));
    expect(await screen.findByText("API connected")).toBeVisible();
  });

  it("validates payloads rather than claiming an unhealthy service is connected", () => {
    expect(() => parseHealth({ ...healthy, database: "offline" })).toThrow("Unexpected health");
  });

  it("preserves the shared API error", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: "INTERNAL_ERROR", message: "Unavailable", request_id: "req_test" },
    }), { status: 503 })));
    await expect(healthApi.getHealth()).rejects.toMatchObject({ code: "INTERNAL_ERROR", status: 503, requestId: "req_test" });
  });

  it("reports missing configuration and malformed JSON", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    await expect(healthApi.getHealth()).rejects.toMatchObject({ code: "CONFIGURATION_ERROR" });
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("invalid")));
    await expect(healthApi.getHealth()).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});
