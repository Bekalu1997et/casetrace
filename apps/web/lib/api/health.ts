import type { HealthResponse } from "@/types/api";
import { ApiRequestError, request } from "./client";

export function parseHealth(value: unknown): HealthResponse {
  if (value && typeof value === "object" && "status" in value && value.status === "ok"
    && "database" in value && value.database === "connected"
    && "version" in value && typeof value.version === "string") {
    return { status: value.status, version: value.version, database: value.database };
  }
  throw new ApiRequestError("Unexpected health response from the API.", "INVALID_RESPONSE");
}

export const healthApi = { getHealth: (signal?: AbortSignal) => request("/api/health", parseHealth, signal) };
