"use client";
import { useRef, useState } from "react";
import { useConversation } from "../hooks/use-conversation";
import { LinkedInvestigation } from "./linked-investigation";
import { Button } from "@/components/ui/button";
import { Time, humanize } from "@/components/shared/presentation";
import type { Anchor, Finding } from "@/types/investigation";
import type { ChatFocus, ChatRequest } from "@/types/chat";
const suggestions = ["Tell me about this case.", "What are the most important findings?", "Investigate the symptom timeline.", "Review medication changes.", "What evidence is still missing?"];
export function Conversation({ id, onOpen, onCompare, findings, children }: {
  id: string; onOpen: (anchor: Anchor) => void; onCompare?: (anchors: Anchor[]) => void; findings: Finding[]; children: React.ReactNode | ((ask: (message: string) => void) => React.ReactNode);
}) {
  const { messages, loading, pending, error, send, retry } = useConversation(id);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<ChatRequest["mode"]>("ask");
  const [focus, setFocus] = useState<ChatFocus>("all");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const [newAnswer, setNewAnswer] = useState(false);
  const scrollToEnd = () => { if (thread.current) thread.current.scrollTop = thread.current.scrollHeight; setNewAnswer(false); };
  async function submit() {
    const text = draft.trim(); if (!text || pending) return;
    if (await send({ message: text, mode, focus })) {
      setDraft(current => current.trim() === text ? "" : current);
      if (nearBottom.current) requestAnimationFrame(scrollToEnd); else setNewAnswer(true);
    }
  }
  return <section className="conversation" aria-label="Case conversation">
    <div className="conversation-thread" ref={thread} onScroll={() => { const el = thread.current; if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; }}>
      <div className="conversation-reading">
        {loading && <p role="status">Loading saved conversation...</p>}
        {!loading && !messages.length && <div className="conversation-welcome"><span className="conversation-mark" aria-hidden="true">C</span><h1>Explore the evidence together.</h1><p>Explore this patient&apos;s medical history, ask questions about the clinical evidence, or start a focused investigation.</p><div className="suggested-prompts">{suggestions.map(prompt => <button key={prompt} onClick={() => { setDraft(prompt); textarea.current?.focus(); }}>{prompt}<span aria-hidden="true"> +</span></button>)}</div></div>}
        {messages.map(message => <article key={message.id} className={`conversation-message message-${message.role}`}>
          <div className="message-byline"><strong>{message.role === "user" ? "You" : "CASETRACE"}</strong><Time value={message.created_at} /></div>
          <div className="message-content">{message.content}</div>
          {message.role === "assistant" && <>
            <div className="flex flex-wrap gap-2 mt-3">{message.citations.map(citation => <button className="source-link" key={citation.id} onClick={() => onOpen(citation.anchor)}>{citation.id} / {citation.anchor.source.id}</button>)}</div>
            {onCompare && new Set(message.citations.map(c => `${c.anchor.source.type}:${c.anchor.source.id}`)).size > 1 && <button className="source-link mt-2" onClick={() => onCompare([...new Map(message.citations.map(c => [`${c.anchor.source.type}:${c.anchor.source.id}`, c.anchor])).values()].slice(0, 2))}>Compare cited records</button>}
            {message.finding_ids.map(findingId => { const finding = findings.find(item => item.id === findingId); return <a className="source-link mt-2 mr-2" key={findingId} href="#investigation-findings" onClick={() => { const target = document.getElementById("investigation-findings"); if (target instanceof HTMLDetailsElement) target.open = true; }}>{finding?.title ?? findingId}{finding && ` / ${finding.status}`}</a>; })}
            {!!message.limitations.length && <details className="text-xs text-muted-foreground mt-3"><summary>Answer limitations ({message.limitations.length})</summary><ul className="list-disc pl-5 mt-2">{message.limitations.map((text, i) => <li key={i}>{text}</li>)}</ul></details>}
            <p className="text-xs text-muted-foreground mt-3">{message.execution_mode === "deterministic_rules" ? "Stored evidence / deterministic response" : message.execution_mode === "scheduled" ? "Investigation scheduled" : humanize(message.execution_mode)}</p>
            {message.new_investigation_id && <LinkedInvestigation key={message.new_investigation_id} id={message.new_investigation_id} />}
          </>}
        </article>)}
        {pending && <p role="status" className="reviewing-evidence">CASETRACE is reviewing the available evidence...</p>}
        {typeof children === "function" ? children(message => { setDraft(message.slice(0, 2000)); setMode("ask"); document.getElementById("case-message")?.focus(); }) : children}
      </div>
    </div>
    <div className="conversation-bottom"><div className="conversation-reading">
      {newAnswer && <button className="source-link mb-2" onClick={scrollToEnd}>Jump to new answer v</button>}
      {error && <div role="alert" className="notice mb-3 text-sm">{error} <Button variant="outline" disabled={pending || loading} onClick={retry}>Refresh history</Button></div>}
      <form className="chat-composer" onSubmit={event => { event.preventDefault(); void submit(); }}>
        <label className="sr-only" htmlFor="case-message">Ask CASETRACE</label>
        <textarea id="case-message" ref={textarea} value={draft} maxLength={2000} rows={3} placeholder="Ask CASETRACE anything about this case..." onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(); } }} />
        <div className="composer-controls"><label>Mode <select aria-label="Conversation mode" value={mode} onChange={event => setMode(event.target.value as ChatRequest["mode"])}><option value="ask">Ask</option><option value="investigate">Investigate</option></select></label><label>Focus <select aria-label="Investigation focus" value={focus} onChange={event => setFocus(event.target.value as ChatFocus)}>{["all", "timeline", "medication", "followup", "hypothesis"].map(value => <option key={value} value={value}>{value === "all" ? "Whole case" : humanize(value)}</option>)}</select></label><Button type="submit" aria-label="Send message" disabled={pending || loading || !draft.trim()}>{pending ? "..." : "Send"}</Button></div>
      </form><p className="composer-caption">Synthetic demo / Evidence-backed investigation, not clinical advice. Shift+Enter for a new line.</p>
    </div></div>
  </section>;
}
