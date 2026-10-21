import { ApiRequestError, request } from "./client";
import type { Finding, Investigation, InvestigationCreated, InvestigationEvent,
  InvestigationReport, Objective } from "@/types/investigation";

const prefix = "/api/investigations";
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiRequestError("Invalid investigation response.", "INVALID_RESPONSE");
  return value as Record<string, unknown>;
}
function fields(value: unknown, names: string[]): Record<string, unknown> {
  const result = object(value);
  if (!names.every(name => typeof result[name] === "string"))
    throw new ApiRequestError("Invalid investigation fields.", "INVALID_RESPONSE");
  return result;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new ApiRequestError("Invalid result list.", "INVALID_RESPONSE");
  return value;
}
function parseFinding(value: unknown): Finding {
  const result = fields(value, ["id", "investigation_id", "type", "status", "title", "claim", "support_level"]);
  array(result.anchors).forEach(anchor => {
    const row = fields(anchor, ["field", "source_hash", "relationship"]);
    fields(row.source, ["type", "id"]);
    if (typeof row.source_version !== "number") throw new ApiRequestError("Invalid source version.", "INVALID_RESPONSE");
  });
  fields(result.verification, ["status", "classification"]);
  return result as unknown as Finding;
}
function parseState(value: unknown): Investigation {
  const result = fields(value, ["id", "patient_id", "case_id", "status", "objective", "created_at"]);
  const progress = object(result.progress);
  if (typeof progress.percent !== "number" || typeof result.version !== "number")
    throw new ApiRequestError("Invalid investigation progress.", "INVALID_RESPONSE");
  array(result.agents).forEach(agent => fields(agent, ["name", "status"]));
  array(result.timeline); array(result.hypotheses); array(result.limitations);
  return result as unknown as Investigation;
}
function parseReport(value: unknown): InvestigationReport {
  const result = fields(value, ["investigation_id", "status", "generated_at", "execution_mode"]);
  fields(result.summary, ["headline", "description"]);
  for (const key of ["verified_findings", "rejected_findings", "unresolved_findings"])
    array(result[key]).forEach(parseFinding);
  array(result.timeline); array(result.hypotheses); array(result.limitations);
  return result as unknown as InvestigationReport;
}
const path = (id: string) => `${prefix}/${encodeURIComponent(id)}`;
export const investigationsApi = {
  create: (patientId: string, objective: Objective = "full_record_investigation",
    idempotencyKey?: string, signal?: AbortSignal) => request(prefix, value =>
      fields(value, ["investigation_id", "status", "patient_id", "created_at"]) as unknown as InvestigationCreated,
      signal, { method: "POST", body: JSON.stringify({ patient_id: patientId, objective }),
        headers: { "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) } }),
  get: (id: string, signal?: AbortSignal) => request(path(id), parseState, signal),
  findings: (id: string, signal?: AbortSignal) => request(`${path(id)}/findings`, value => {
    const page = object(value);
    return { items: array(page.items).map(parseFinding), total: Number(page.total) };
  }, signal),
  finding: (id: string, findingId: string, signal?: AbortSignal) => request(
    `${path(id)}/findings/${encodeURIComponent(findingId)}`, parseFinding, signal),
  report: (id: string, signal?: AbortSignal) => request(`${path(id)}/report`, parseReport, signal),
  events: (id: string, after = 0, signal?: AbortSignal) => request(`${path(id)}/events?after=${after}`, value => {
    const page = object(value);
    const items = array(page.items).map(item => {
      const event = fields(item, ["id", "investigation_id", "type", "timestamp"]);
      object(event.payload);
      if (typeof event.sequence !== "number") throw new ApiRequestError("Invalid event cursor.", "INVALID_RESPONSE");
      return event as unknown as InvestigationEvent;
    });
    return { items, total: Number(page.total) };
  }, signal),
  streamUrl: (id: string, after = 0): string => {
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) throw new ApiRequestError("API address is not configured.", "CONFIGURATION_ERROR");
    return `${base.replace(/\/$/, "")}${path(id)}/stream?after=${after}`;
  },
};
