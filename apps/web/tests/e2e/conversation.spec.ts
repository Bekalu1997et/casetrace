import { test, expect } from "@playwright/test";
test("conversation, history, linked run and evidence work at desktop and mobile widths", async ({ page }, info) => {
  test.setTimeout(180000);
  const id = "INV-CHAT-CONTROL";
  const anchor = { source: { type: "clinical_event", id: "EVT-CONTROL" }, source_version: 1, source_hash: "abc", field: "description", expected: "Recorded observation", quote: "Recorded observation", relationship: "supports", encounter_id: null };
  const state = { id, patient_id: "SYN-CONTROL", case_id: "CASE-CONTROL", objective: "full_record_investigation", status: "completed", version: 1, created_at: "2026-01-01T00:00:00Z", started_at: null, completed_at: null, progress: { current_stage: "completed", completed_stages: 6, total_stages: 6, percent: 100 }, agents: [], finding_summary: {}, timeline: [], hypotheses: [], limitations: [] };
  const messages: object[] = [];
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    let data: object = {};
    if (url.pathname.endsWith("/chat")) {
      if (route.request().method() === "POST") {
        const input = route.request().postDataJSON();
        expect(input.mode).toBe("investigate"); expect(input.focus).toBe("timeline");
        const base = { conversation_id: `CHAT-${id}`, created_at: state.created_at, citations: [], finding_ids: [], limitations: [], execution_mode: "deterministic_rules", new_investigation_id: null };
        const user = { ...base, id: "M1", role: "user", content: input.message };
        const assistant = { ...base, id: "M2", role: "assistant", content: "The control records are available for review.", citations: [{ id: "C1", anchor }], new_investigation_id: "INV-NEXT" };
        messages.push(user, assistant); data = { conversation_id: `CHAT-${id}`, investigation_id: id, user_message: user, assistant_message: assistant };
      } else data = { conversation_id: `CHAT-${id}`, investigation_id: id, items: messages, total: messages.length, has_more: false };
    } else if (url.pathname.endsWith("/findings") || url.pathname.endsWith("/events")) data = { items: [], total: 0 };
    else if (url.pathname.includes("/investigations/")) data = state;
    else data = { data: { id: "EVT-CONTROL", patient_id: "SYN-CONTROL", description: "Recorded observation", event_type: "symptom", source_version: 1, source_hash: "abc" }, meta: { request_id: "TEST" } };
    await route.fulfill({ json: data });
  });
  await page.goto(`/investigations/${id}`);
  await expect(page.getByRole("textbox", { name: "Ask CASETRACE" })).toBeVisible();
  await expect(page.getByText("Explore the evidence together.")).toBeVisible();
  const activity = page.locator("details.compact-activity"); await expect(activity).not.toHaveAttribute("open", "");
  await activity.locator("summary").click(); await expect(page.getByRole("heading", { name: "Persisted execution history" })).toBeVisible(); await activity.locator("summary").click();
  await page.getByRole("button", { name: /Tell me about this case/ }).click();
  await page.getByLabel("Conversation mode").selectOption("investigate"); await page.getByLabel("Investigation focus").selectOption("timeline");
  await page.getByRole("textbox").press("Enter");
  await expect(page.getByText("The control records are available for review.")).toBeVisible();
  await expect(page.getByRole("link", { name: /follow progress/ })).toHaveAttribute("href", "/investigations/INV-NEXT");
  await page.reload(); await expect(page.getByText("The control records are available for review.")).toBeVisible();
  for (const width of [1440, 1280, 1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("textbox")).toBeVisible();
    const composer = await page.getByRole("button", { name: "Send message" }).boundingBox(); expect(composer!.y + composer!.height).toBeLessThanOrEqual(900);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`conversation-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "C1 / EVT-CONTROL" }).click();
    await expect(page.getByRole("complementary", { name: "Evidence inspector" })).toBeVisible();
    await expect(page.getByText("Cited field: description")).toBeVisible();
    await expect(page.locator("mark").first()).toHaveText("Recorded observation");
    await page.screenshot({ path: info.outputPath(`evidence-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Close evidence" }).click();
    await expect(page.getByRole("complementary", { name: "Evidence inspector" })).not.toBeAttached();
  }
});
