import { request, ApiRequestError } from "./client";
import { fields, array, anchors, assertIdentity, total, oneOf } from "@/lib/validation/investigation";
import { validateTime } from "@/lib/validation/time";
import type { ChatMessage, ChatHistory, ChatRequest, ChatResponse } from "@/types/chat";
const path = (id: string) => `/api/investigations/${encodeURIComponent(id)}/chat`;
function message(value: unknown, conversation: string): ChatMessage {
  const row = fields(value, ["id", "conversation_id", "role", "content", "created_at", "execution_mode"]);
  assertIdentity(row.conversation_id as string, conversation);
  oneOf(row.role, ["user", "assistant"]); validateTime(row.created_at);
  array(row.citations).forEach(value => { const citation = fields(value, ["id"]); anchors([citation.anchor]); });
  for (const key of ["finding_ids", "limitations"]) if (!array(row[key]).every(item => typeof item === "string")) throw new ApiRequestError("Invalid conversation text list.", "INVALID_RESPONSE");
  if (row.new_investigation_id !== null && typeof row.new_investigation_id !== "string") throw new ApiRequestError("Invalid linked investigation.", "INVALID_RESPONSE");
  return row as unknown as ChatMessage;
}
function identity(value: unknown, id: string) {
  const row = fields(value, ["conversation_id", "investigation_id"]);
  assertIdentity(row.investigation_id as string, id);
  assertIdentity(row.conversation_id as string, `CHAT-${id}`);
  return row;
}
export const chatApi = {
  history: (id: string, after = 0, signal?: AbortSignal) => request(`${path(id)}?after=${after}&limit=100`, value => {
    const row = identity(value, id);
    const items = array(row.items).map(item => message(item, row.conversation_id as string));
    if (typeof row.has_more !== "boolean") throw new ApiRequestError("Invalid conversation pagination.", "INVALID_RESPONSE");
    return { ...row, items, total: total(row.total) } as unknown as ChatHistory;
  }, signal),
  send: (id: string, input: ChatRequest, signal?: AbortSignal) => request(path(id), value => {
    const row = identity(value, id);
    const user = message(row.user_message, row.conversation_id as string), assistant = message(row.assistant_message, row.conversation_id as string);
    oneOf(user.role, ["user"]); oneOf(assistant.role, ["assistant"]);
    return { ...row, user_message: user, assistant_message: assistant } as unknown as ChatResponse;
  }, signal, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }, 180000),
};
