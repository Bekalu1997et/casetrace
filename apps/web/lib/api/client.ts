import type { ApiErrorResponse } from "@/types/api";

export class ApiRequestError extends Error {
  constructor(message: string, public readonly code: string,
    public readonly status?: number, public readonly requestId?: string) {
    super(message);
    this.name = "ApiRequestError";
  }
}

function isErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!value || typeof value !== "object" || !("error" in value)) return false;
  const error = value.error;
  return !!error && typeof error === "object" && "code" in error && "message" in error
    && typeof error.code === "string" && typeof error.message === "string"
    && (!("request_id" in error) || typeof error.request_id === "string");
}

export async function request<T>(path: string, parse: (value: unknown) => T,
  signal?: AbortSignal): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) throw new ApiRequestError("API address is not configured.", "CONFIGURATION_ERROR");
  const timeout = AbortSignal.timeout(8000);
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
      headers: { Accept: "application/json" }, cache: "no-store",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch {
    throw new ApiRequestError("Unable to reach the API. Check that the backend is running.", "NETWORK_ERROR");
  }
  let body: unknown;
  try { body = await response.json(); }
  catch { throw new ApiRequestError("The API returned invalid JSON.", "INVALID_RESPONSE", response.status); }
  if (!response.ok) {
    if (isErrorResponse(body)) throw new ApiRequestError(
      body.error.message, body.error.code, response.status, body.error.request_id ?? ("meta" in body && body.meta && typeof body.meta === "object" && "request_id" in body.meta && typeof body.meta.request_id === "string" ? body.meta.request_id : undefined),
    );
    throw new ApiRequestError("The API request failed.", "HTTP_ERROR", response.status);
  }
  return parse(body);
}
