import { request, ApiRequestError } from "./client";
import { object, fields, array, total, assertIdentity, oneOf } from "@/lib/validation/investigation";
import { validateTime } from "@/lib/validation/time";
import type { SourceRef } from "@/types/investigation";
export interface ToolAudit { id: string; agent_run_id: string; agent: string; attempt: number; tool: string; status: string; arguments: Record<string, string | number | boolean | null>; source_refs: SourceRef[]; started_at: string; completed_at: string | null; duration_ms: number | null; error_code: string | null }
export function parseToolPage(value: unknown, id: string) {
  const page = fields(value, ["investigation_id"]); assertIdentity(String(page.investigation_id), id);
  const items = array(page.items).map(value => {
    const row = fields(value, ["id", "agent_run_id", "agent", "tool", "status", "started_at"]);
    oneOf(row.status, ["running", "succeeded", "failed"]); total(row.attempt); validateTime(row.started_at);
    if (row.completed_at !== null) validateTime(row.completed_at);
    if (row.duration_ms !== null) total(row.duration_ms);
    if (row.error_code !== null && typeof row.error_code !== "string") throw new ApiRequestError("Invalid tool error.", "INVALID_RESPONSE");
    Object.values(object(row.arguments)).forEach(value => { if (value !== null && !["string", "number", "boolean"].includes(typeof value)) throw new ApiRequestError("Invalid tool parameters.", "INVALID_RESPONSE"); });
    array(row.source_refs).forEach(ref => fields(ref, ["type", "id"]));
    return row as unknown as ToolAudit;
  });
  return { items, total: total(page.total), limit: total(page.limit), offset: total(page.offset) };
}
export const toolAuditApi = { list: (id: string, offset: number, signal?: AbortSignal) => request(`/api/investigations/${encodeURIComponent(id)}/tools?limit=20&offset=${offset}`, value => parseToolPage(value, id), signal) };
