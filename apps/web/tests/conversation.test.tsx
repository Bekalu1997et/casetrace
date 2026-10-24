import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Conversation } from "@/features/investigations/components/conversation";
import { chatApi } from "@/lib/api/chat";
import type { ChatMessage } from "@/types/chat";
const base: ChatMessage = { id: "M1", conversation_id: "CHAT-I", role: "user", content: "Question", created_at: "2026-01-01T00:00:00Z", citations: [], finding_ids: [], limitations: [], execution_mode: "deterministic_rules", new_investigation_id: null };
const answer: ChatMessage = { ...base, id: "M2", role: "assistant", content: "Original answer", new_investigation_id: "NEXT", citations: [{ id: "C1", anchor: { source: { type: "document", id: "D1" }, field: "text", source_version: 1, source_hash: "abc", expected: "text", quote: "text", relationship: "supports", encounter_id: null } }] };
beforeEach(() => vi.spyOn(chatApi, "history").mockResolvedValue({ conversation_id: "CHAT-I", investigation_id: "I", items: [], total: 0, has_more: false }));
afterEach(() => vi.restoreAllMocks());
const view = (open = vi.fn()) => render(<Conversation id="I" onOpen={open} findings={[]}><details><summary>View investigation activity</summary>Recorded event</details></Conversation>);
it("loads persisted paginated history, citations, linked runs and honest fallback labels", async () => {
  vi.mocked(chatApi.history).mockResolvedValueOnce({ conversation_id: "CHAT-I", investigation_id: "I", items: [base], total: 2, has_more: true }).mockResolvedValueOnce({ conversation_id: "CHAT-I", investigation_id: "I", items: [answer], total: 2, has_more: false });
  const open = vi.fn(); view(open);
  expect(await screen.findByText("Original answer")).toBeVisible();
  expect(chatApi.history).toHaveBeenLastCalledWith("I", 1, expect.any(AbortSignal));
  fireEvent.click(screen.getByRole("button", { name: "C1 / D1" })); expect(open).toHaveBeenCalledWith(answer.citations[0].anchor);
  expect(screen.getByRole("link", { name: /Open investigation/ })).toHaveAttribute("href", "/investigations/NEXT");
  expect(screen.getByText(/deterministic response/)).toBeVisible();
});
it("submits real messages once, supports modes and preserves edits during pending requests", async () => {
  let finish!: (value: Awaited<ReturnType<typeof chatApi.send>>) => void;
  const send = vi.spyOn(chatApi, "send").mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  view(); fireEvent.click(await screen.findByText("Tell me about this case."));
  const input = screen.getByRole("textbox", { name: "Ask CASETRACE" });
  fireEvent.change(screen.getByLabelText("Conversation mode"), { target: { value: "investigate" } });
  fireEvent.change(screen.getByLabelText("Investigation focus"), { target: { value: "medication" } });
  fireEvent.keyDown(input, { key: "Enter", shiftKey: true }); expect(send).not.toHaveBeenCalled();
  fireEvent.keyDown(input, { key: "Enter" }); fireEvent.keyDown(input, { key: "Enter" });
  expect(send).toHaveBeenCalledTimes(1); expect(send.mock.calls[0][1]).toEqual({ message: "Tell me about this case.", mode: "investigate", focus: "medication" });
  fireEvent.change(input, { target: { value: "Next question" } });
  finish({ conversation_id: "CHAT-I", investigation_id: "I", user_message: base, assistant_message: answer });
  expect(await screen.findByText("Original answer")).toBeVisible(); expect(input).toHaveValue("Next question");
});
it("keeps input after failure and reloads saved messages without retrying POST", async () => {
  const send = vi.spyOn(chatApi, "send").mockRejectedValue(new Error("Connection lost")); view();
  fireEvent.click(await screen.findByText("Tell me about this case.")); fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Connection lost"); expect(screen.getByRole("textbox")).toHaveValue("Tell me about this case.");
  fireEvent.click(screen.getByRole("button", { name: "Refresh history" }));
  await waitFor(() => expect(chatApi.history).toHaveBeenCalledTimes(2)); expect(send).toHaveBeenCalledTimes(1);
});
it("clears a successfully submitted draft and keeps activity collapsed", async () => {
  vi.spyOn(chatApi, "send").mockResolvedValue({ conversation_id: "CHAT-I", investigation_id: "I", user_message: base, assistant_message: answer }); view();
  fireEvent.click(await screen.findByText("Tell me about this case.")); fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue("")); expect(screen.getByText("Recorded event")).not.toBeVisible();
  fireEvent.click(screen.getByText("View investigation activity")); expect(screen.getByText("Recorded event")).toBeVisible();
});

it("moves a finding question into Ask mode without submitting it automatically", async () => {
  const send = vi.spyOn(chatApi, "send");
  render(<Conversation id="I" onOpen={vi.fn()} findings={[]}>{ask => <button onClick={() => ask("Explain finding F1 and its sources.")}>Ask about finding</button>}</Conversation>);
  await screen.findByText("Explore the evidence together.");
  fireEvent.change(screen.getByLabelText("Conversation mode"), { target: { value: "investigate" } });
  fireEvent.click(screen.getByRole("button", { name: "Ask about finding" }));
  expect(screen.getByRole("textbox")).toHaveValue("Explain finding F1 and its sources.");
  expect(screen.getByLabelText("Conversation mode")).toHaveValue("ask");
  expect(screen.getByRole("textbox")).toHaveFocus(); expect(send).not.toHaveBeenCalled();
});
