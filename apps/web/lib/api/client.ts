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

export function apiUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) throw new ApiRequestError("API address is not configured.", "CONFIGURATION_ERROR");
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export async function fetchApi(path: string, signal?: AbortSignal, options?: RequestInit, streaming = false): Promise<Response> {
  const url = apiUrl(path);
  const timeout = streaming ? undefined : AbortSignal.timeout(8000);
  try {
    return await fetch(url, { ...options, cache: "no-store",
      signal: signal && timeout ? AbortSignal.any([signal, timeout]) : signal ?? timeout });
  } catch (error) {
    if (signal?.aborted) throw new ApiRequestError("Request cancelled.", "CANCELLED");
    if (timeout?.aborted) throw new ApiRequestError("The API request timed out. Retry the request.", "TIMEOUT");
    throw new ApiRequestError(error instanceof Error ? "Unable to reach the API. Check that the backend is running." : "API connection failed.", "NETWORK_ERROR");
  }
}

export async function request<T>(path: string, parse: (value: unknown) => T,
  signal?: AbortSignal, options?: Pick<RequestInit, "method" | "body" | "headers">): Promise<T> {
  const response = await fetchApi(path, signal, { ...options,
    headers: { Accept: "application/json", ...options?.headers } });
  let body: unknown;
  try { body = await response.json(); }
  catch { throw new ApiRequestError("The API returned invalid JSON.", "INVALID_RESPONSE", response.status); }
  if (!response.ok) {
    if (isErrorResponse(body)) throw new ApiRequestError(
      body.error.message, body.error.code, response.status, body.error.request_id ?? ("meta" in body && body.meta && typeof body.meta === "object" && "request_id" in body.meta && typeof body.meta.request_id === "string" ? body.meta.request_id : undefined),
    );
    throw new ApiRequestError("The API request failed.", "HTTP_ERROR", response.status);
  }
  try { return parse(body); }
  catch (error) {
    if (error instanceof ApiRequestError) throw error;
    throw new ApiRequestError("The API response does not match the expected contract.", "INVALID_RESPONSE", response.status);
  }
}
