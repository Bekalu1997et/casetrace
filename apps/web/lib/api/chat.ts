import { request } from "./client";
import type { Anchor } from "@/types/investigation";
export interface Message { id: string; role: string; content: string; citations: { id: string; anchor: Anchor }[]; limitations: string[]; new_investigation_id: string | null; execution_mode: string }
function history(value: unknown): { items: Message[]; has_more: boolean } {
  if (!value || typeof value !== "object" || !("items" in value) || !Array.isArray(value.items)) throw Error("Invalid conversation history");
  value.items.forEach(message);
  return value as { items: Message[]; has_more: boolean };
}
function message(value: unknown): Message {
  if (!value || typeof value !== "object") throw Error("Invalid conversation message");
  const row = value as Message;
  if (typeof row.id !== "string" || typeof row.content !== "string" || !["user", "assistant"].includes(row.role) || !Array.isArray(row.citations) || !Array.isArray(row.limitations)) throw Error("Invalid conversation message");
  for (const citation of row.citations) if (!citation.anchor?.source || typeof citation.anchor.source.id !== "string" || typeof citation.anchor.source.type !== "string") throw Error("Invalid citation");
  return row;
}
export const chatApi = {
 history: (id: string, after: number, signal: AbortSignal) => request(`/api/investigations/${encodeURIComponent(id)}/chat?after=${after}&limit=100`, history, signal),
 send: (id: string, text: string, mode: string, focus: string) => request(`/api/investigations/${encodeURIComponent(id)}/chat`, value => {
 const row = value as { user_message: unknown; assistant_message: unknown };
 return [message(row.user_message), message(row.assistant_message)];
 }, undefined, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text.trim(), mode, focus }) })
};
