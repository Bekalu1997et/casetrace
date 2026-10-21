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
function stringList(value: unknown) {
  if (!array(value).every(item => typeof item === "string"))
    throw new ApiRequestError("Invalid text list.", "INVALID_RESPONSE");
}
function anchors(value: unknown) {
  array(value).forEach(anchor => {
    const row = fields(anchor, ["field", "source_hash", "relationship"]);
    fields(row.source, ["type", "id"]);
    if (!Number.isInteger(row.source_version)) throw new ApiRequestError("Invalid source version.", "INVALID_RESPONSE");
  });
}
function timeline(value: unknown) {
  array(value).forEach(item => {
    const row = fields(item, ["id", "timestamp_type", "title", "precision"]);
    fields(row.source, ["type", "id"]);
    if (row.timestamp !== null && typeof row.timestamp !== "string") throw new ApiRequestError("Invalid clinical time.", "INVALID_RESPONSE");
    Object.values(object(row.timestamps)).forEach(time => {
      if (time !== null && typeof time !== "string") throw new ApiRequestError("Invalid clinical timestamps.", "INVALID_RESPONSE");
    });
  });
}
function hypotheses(value: unknown) {
  array(value).forEach(item => {
    const row = fields(item, ["explanation", "verdict"]);
    anchors(row.supports); anchors(row.weakens); stringList(row.missing_evidence);
  });
}
function parseFinding(value: unknown): Finding {
  const result = fields(value, ["id", "investigation_id", "type", "status", "title", "claim", "claim_kind", "support_level"]);
  anchors(result.anchors); stringList(result.alternatives); stringList(result.limitations);
  const verification = fields(result.verification, ["status", "classification"]);
  array(verification.checks).forEach(check => fields(check, ["type", "status", "message"]));
  return result as unknown as Finding;
}
function parseState(value: unknown): Investigation {
  const result = fields(value, ["id", "patient_id", "case_id", "status", "objective", "created_at"]);
  const progress = object(result.progress);
  if (!["percent", "completed_stages", "total_stages"].every(key => typeof progress[key] === "number" && Number.isFinite(progress[key])) || typeof progress.current_stage !== "string" || typeof result.version !== "number")
    throw new ApiRequestError("Invalid investigation progress.", "INVALID_RESPONSE");
  array(result.agents).forEach(agent => fields(agent, ["name", "status"]));
  timeline(result.timeline); hypotheses(result.hypotheses); stringList(result.limitations);
  return result as unknown as Investigation;
}
function parseReport(value: unknown): InvestigationReport {
  const result = fields(value, ["investigation_id", "status", "generated_at", "execution_mode"]);
  fields(result.summary, ["headline", "description"]);
  for (const key of ["verified_findings", "rejected_findings", "unresolved_findings"])
    array(result[key]).forEach(parseFinding);
  timeline(result.timeline); hypotheses(result.hypotheses); stringList(result.limitations);
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
