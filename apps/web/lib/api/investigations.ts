import { request, apiUrl } from "./client";
import { parseState, parseReport, parseFinding, parseEvent, object, fields, array, total, assertIdentity } from "@/lib/validation/investigation";
import type { InvestigationCreated, Objective } from "@/types/investigation";

const prefix = "/api/investigations";
const path = (id: string) => `${prefix}/${encodeURIComponent(id)}`;
export const investigationsApi = {
  create: (patientId: string, objective: Objective = "full_record_investigation",
    idempotencyKey?: string, signal?: AbortSignal) => request(prefix, value =>
      fields(value, ["investigation_id", "status", "patient_id", "created_at"]) as unknown as InvestigationCreated,
      signal, { method: "POST", body: JSON.stringify({ patient_id: patientId, objective }),
        headers: { "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) } }),
  get: (id: string, signal?: AbortSignal) => request(path(id), value => { const result = parseState(value); assertIdentity(result.id, id); return result; }, signal),
  findings: (id: string, signal?: AbortSignal) => request(`${path(id)}/findings`, value => {
    const page = object(value);
    return { items: array(page.items).map(item => { const finding = parseFinding(item); assertIdentity(finding.investigation_id, id); return finding; }), total: total(page.total) };
  }, signal),
  finding: (id: string, findingId: string, signal?: AbortSignal) => request(
    `${path(id)}/findings/${encodeURIComponent(findingId)}`, value => { const result = parseFinding(value); assertIdentity(result.investigation_id, id); assertIdentity(result.id, findingId); return result; }, signal),
  report: (id: string, signal?: AbortSignal) => request(`${path(id)}/report`, value => { const result = parseReport(value); assertIdentity(result.investigation_id, id); return result; }, signal),
  events: (id: string, after = 0, signal?: AbortSignal) => request(`${path(id)}/events?after=${after}`, value => {
    const page = object(value);
    const items = array(page.items).map(item => parseEvent(item, id));
    return { items, total: total(page.total) };
  }, signal),
  streamUrl: (id: string, after = 0): string => {
    return apiUrl(`${path(id)}/stream?after=${after}`);
  },
};
