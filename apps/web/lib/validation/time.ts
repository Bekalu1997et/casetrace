import { ApiRequestError } from "@/lib/api/client";
export function validateTime(value: unknown, dateOnly = false): void {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) throw new ApiRequestError("Invalid timestamp.", "INVALID_RESPONSE");
  const date = value.slice(0, 10);
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date
    || (!(dateOnly && value.length === 10) && (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value)))))
    throw new ApiRequestError("Invalid timestamp or missing timezone.", "INVALID_RESPONSE");
}
