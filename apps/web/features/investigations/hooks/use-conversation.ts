"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { chatApi } from "@/lib/api/chat";
import type { ChatMessage, ChatRequest } from "@/types/chat";
export function useConversation(id: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const load = useCallback(async (signal: AbortSignal) => {
    let after = 0; const items: ChatMessage[] = [];
    while (!signal.aborted) {
      const page = await chatApi.history(id, after, signal);
      items.push(...page.items); after += page.items.length;
      if (!page.has_more) break;
      if (!page.items.length) throw new Error("Conversation history could not be fully loaded.");
    }
    if (!signal.aborted) setMessages([...new Map(items.map(item => [item.id, item])).values()]);
  }, [id]);
  useEffect(() => {
    const active = new AbortController(); controller.current = active; locked.current = false;
    Promise.resolve().then(() => load(active.signal)).then(() => { if (!active.signal.aborted) { setLoading(false); setError(undefined); } })
      .catch(error => { if (!active.signal.aborted) { setLoading(false); setError(error instanceof Error ? error.message : "Conversation unavailable."); } });
    return () => active.abort();
  }, [load, revision]);
  async function send(input: ChatRequest) {
    if (locked.current || loading || !controller.current) return false;
    locked.current = true; setPending(true); setError(undefined);
    const signal = controller.current.signal;
    try {
      const result = await chatApi.send(id, input, signal);
      if (signal.aborted) return false;
      setMessages(previous => [...new Map([...previous, result.user_message, result.assistant_message].map(item => [item.id, item])).values()]);
      return true;
    } catch (error) {
      if (!signal.aborted) setError(`${error instanceof Error ? error.message : "Message could not be sent."} Refresh history before resending: the request may already have been saved.`);
      return false;
    } finally { if (!signal.aborted) { locked.current = false; setPending(false); } }
  }
  return { messages, loading, pending, error, send, retry: () => { setLoading(true); setRevision(v => v + 1); } };
}
