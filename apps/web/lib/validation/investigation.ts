import { ApiRequestError } from "@/lib/api/client";
import { validateTime } from "./time";
import type { Finding, Investigation, InvestigationReport, InvestigationEvent } from "@/types/investigation";
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiRequestError("Invalid investigation response.", "INVALID_RESPONSE");
  return value as Record<string, unknown>;
}
export function fields(value: unknown, names: string[]): Record<string, unknown> {
  const result = object(value);
  if (!names.every(name => typeof result[name] === "string"))
    throw new ApiRequestError("Invalid investigation fields.", "INVALID_RESPONSE");
  return result;
}
export function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new ApiRequestError("Invalid result list.", "INVALID_RESPONSE");
  return value;
}
export function oneOf(value: unknown, allowed: readonly string[]): void {
  if (typeof value !== "string" || !allowed.includes(value)) throw new ApiRequestError("Invalid contract status.", "INVALID_RESPONSE");
}
export const runStatuses = ["queued", "running", "completed", "completed_with_limitations", "failed", "cancelled"];
export function total(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 0) throw new ApiRequestError("Invalid result total.", "INVALID_RESPONSE");
  return value as number;
}
export function assertIdentity(actual: string, expected: string): void {
  if (actual !== expected) throw new ApiRequestError("Response identity does not match the request.", "SOURCE_SCOPE_MISMATCH");
}
function stringList(value: unknown) {
  if (!array(value).every(item => typeof item === "string"))
    throw new ApiRequestError("Invalid text list.", "INVALID_RESPONSE");
}
export function anchors(value: unknown) {
  array(value).forEach(anchor => {
    const row = fields(anchor, ["field", "source_hash", "relationship"]);
    fields(row.source, ["type", "id"]);
    const start = row.char_start, end = row.char_end;
    if ((start != null || end != null) && (!Number.isInteger(start) || !Number.isInteger(end)
      || (start as number) < 0 || (end as number) <= (start as number) || typeof row.quote !== "string"))
      throw new ApiRequestError("Invalid citation offsets.", "INVALID_RESPONSE");
    oneOf(row.relationship, ["supports", "contradicts", "contextualizes", "derived_from"]);
    if (!Number.isInteger(row.source_version) || (row.source_version as number) < 1) throw new ApiRequestError("Invalid source version.", "INVALID_RESPONSE");
  });
}
function timeline(value: unknown) {
  array(value).forEach(item => {
    const row = fields(item, ["id", "timestamp_type", "title", "precision"]);
    fields(row.source, ["type", "id"]);
    if (row.timestamp !== null && typeof row.timestamp !== "string") throw new ApiRequestError("Invalid clinical time.", "INVALID_RESPONSE");
    oneOf(row.precision, ["instant", "day", "unknown"]);
    if (row.timestamp !== null) validateTime(row.timestamp, true);
    Object.values(object(row.timestamps)).forEach(time => {
      if (time !== null) validateTime(time, true);
      if (time !== null && typeof time !== "string") throw new ApiRequestError("Invalid clinical timestamps.", "INVALID_RESPONSE");
    });
  });
}
function hypotheses(value: unknown) {
  array(value).forEach(item => {
    const row = fields(item, ["explanation", "verdict"]);
    oneOf(row.verdict, ["supported", "weakened", "inconclusive"]);
    anchors(row.supports); anchors(row.weakens); stringList(row.missing_evidence);
    if (row.alternatives !== undefined) stringList(row.alternatives);
    if (row.limitations !== undefined) stringList(row.limitations);
  });
}
export function parseFinding(value: unknown): Finding {
  const result = fields(value, ["id", "investigation_id", "type", "status", "title", "claim", "claim_kind", "support_level"]);
  oneOf(result.status, ["proposed", "verified", "rejected", "unresolved"]);
  oneOf(result.claim_kind, ["observation", "chronology", "interpretation", "hypothesis"]);
  oneOf(result.support_level, ["strong", "limited", "insufficient"]);
  anchors(result.anchors); stringList(result.alternatives); stringList(result.limitations);
  const verification = fields(result.verification, ["status", "classification"]);
  array(verification.checks).forEach(check => fields(check, ["type", "status", "message"]));
  return result as unknown as Finding;
}
export function parseState(value: unknown): Investigation {
  const result = fields(value, ["id", "patient_id", "case_id", "status", "objective", "created_at"]);
  oneOf(result.status, runStatuses);
  validateTime(result.created_at);
  for (const key of ["started_at", "completed_at"]) if (result[key] != null) validateTime(result[key]);
  const progress = object(result.progress);
  if (!["percent", "completed_stages", "total_stages"].every(key => typeof progress[key] === "number" && Number.isFinite(progress[key])) || typeof progress.current_stage !== "string" || typeof result.version !== "number")
    throw new ApiRequestError("Invalid investigation progress.", "INVALID_RESPONSE");
  array(result.agents).forEach(agent => fields(agent, ["name", "status"]));
  timeline(result.timeline); hypotheses(result.hypotheses); stringList(result.limitations);
  return result as unknown as Investigation;
}
export function parseReport(value: unknown): InvestigationReport {
  const result = fields(value, ["investigation_id", "status", "generated_at", "execution_mode"]);
  oneOf(result.status, runStatuses);
  validateTime(result.generated_at);
  fields(result.summary, ["headline", "description"]);
  for (const key of ["verified_findings", "rejected_findings", "unresolved_findings"])
    array(result[key]).forEach(parseFinding);
  timeline(result.timeline); hypotheses(result.hypotheses); stringList(result.limitations);
  return result as unknown as InvestigationReport;
}
export function parseEvent(value: unknown, investigationId: string): InvestigationEvent {
  const event = fields(value, ["id", "investigation_id", "type", "timestamp"]);
  object(event.payload); validateTime(event.timestamp);
  for (const key of ["message", "execution_status"]) if (event[key] != null && typeof event[key] !== "string") throw new ApiRequestError("Invalid activity text.", "INVALID_RESPONSE");
  if (!Number.isInteger(event.sequence) || (event.sequence as number) < 1 || event.investigation_id !== investigationId)
    throw new ApiRequestError("Invalid event identity or cursor.", "INVALID_RESPONSE");
  return event as unknown as InvestigationEvent;
}
