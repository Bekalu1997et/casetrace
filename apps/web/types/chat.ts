import type { Anchor } from "./investigation";
export type ChatFocus = "all" | "timeline" | "medication" | "followup" | "hypothesis";
export interface ChatRequest { message: string; mode: "ask" | "investigate"; focus: ChatFocus }
export interface ChatMessage {
  id: string; conversation_id: string; role: "user" | "assistant"; content: string;
  created_at: string; citations: { id: string; anchor: Anchor }[]; finding_ids: string[];
  limitations: string[]; execution_mode: string; new_investigation_id: string | null;
}
export interface ChatHistory { conversation_id: string; investigation_id: string; items: ChatMessage[]; total: number; has_more: boolean }
export interface ChatResponse { conversation_id: string; investigation_id: string; user_message: ChatMessage; assistant_message: ChatMessage }
