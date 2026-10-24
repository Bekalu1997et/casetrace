"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { chatApi, type Message } from "@/lib/api/chat";
import type { Anchor } from "@/types/investigation";
import { Button } from "@/components/ui/button";
export function CaseConversation({ id, onOpen }: { id: string; onOpen: (anchor: Anchor) => void }) {
  const [items, setItems] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [mode, setMode] = useState("ask");
  const [focus, setFocus] = useState("all");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const busy = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const all: Message[] = [];
        let more = true;
        while (more) {
          const page = await chatApi.history(id, all.length, controller.signal);
          all.push(...page.items); more = page.has_more && page.items.length > 0;
        }
        setItems(all);
      } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Conversation unavailable"); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [id]);
  async function send() {
    if (busy.current || !text.trim()) return;
    busy.current = true; setPending(true); setError("");
    try {
      const response = await chatApi.send(id, text, mode, focus);
      setItems(current => [...new Map([...current, ...response].map(item => [item.id, item])).values()]); setText("");
    } catch (err) { setError(err instanceof Error ? err.message : "Message could not be sent"); }
    finally { busy.current = false; setPending(false); }
  }
  return <section aria-label="Case conversation" className="space-y-4"><h2>Discuss this investigation</h2>{loading && <p role="status">Loading conversation…</p>}{items.map(item => <article key={item.id} className="audit-card space-y-3"><p className="eyebrow">{item.role === "user" ? "You" : "CASETRACE"}</p><p className="whitespace-pre-wrap">{item.content}</p>{item.role === "assistant" && item.execution_mode !== "llm" && <p className="text-xs text-muted-foreground">Response mode: {item.execution_mode}</p>}{item.citations.map(citation => <button key={citation.id} className="source-link mr-3" onClick={() => onOpen(citation.anchor)}>{citation.anchor.source.id}</button>)}{item.limitations.map((limitation, index) => <p className="text-sm text-muted-foreground" key={index}>{limitation}</p>)}{item.new_investigation_id && <Link className="action-link" href={`/investigations/${encodeURIComponent(item.new_investigation_id)}`}>Open linked investigation ?</Link>}</article>)}{error && <p role="alert" className="notice">{error}</p>}<form className="workspace-panel p-4 space-y-3 sticky bottom-0" onSubmit={event => { event.preventDefault(); void send(); }}><label className="block">Ask CASETRACE<textarea className="field w-full mt-2" maxLength={2000} value={text} onChange={event => setText(event.target.value)} placeholder="Ask about the evidence or investigate further…" /></label><div className="flex flex-wrap gap-3"><label>Mode <select className="field" value={mode} onChange={event => setMode(event.target.value)}><option value="ask">Ask</option><option value="investigate">Investigate</option></select></label>{mode === "investigate" && <label>Focus <select className="field" value={focus} onChange={event => setFocus(event.target.value)}>{["all", "timeline", "medication", "followup", "hypothesis"].map(value => <option key={value}>{value}</option>)}</select></label>}<Button disabled={pending || loading || !text.trim()} type="submit">{pending ? "Sending…" : "Send"}</Button></div></form></section>;
}
