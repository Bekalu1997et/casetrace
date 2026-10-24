import { test, expect } from "@playwright/test";
test("real CASE-001 conversation persists and schedules a linked investigation", async ({ page, request }, info) => {
  test.skip(process.env.RUN_LIVE_CHAT !== "1", "Requires the local seeded backend; may call its configured model.");
  test.setTimeout(240000);
  const response = await request.get("http://127.0.0.1:8000/api/investigations?limit=20"); expect(response.ok()).toBe(true);
  const history = await response.json();
  const run = history.items.find((item: { case_id: string }) => item.case_id === "CASE-001"); expect(run).toBeTruthy();
  await page.goto(`/investigations/${run.id}`);
  const composer = page.getByRole("textbox", { name: "Ask CASETRACE" });
  await expect(composer).toBeVisible();
  await composer.fill("Tell me about this patient's case.");
  const reply = page.waitForResponse(response => response.url().includes(`/investigations/${run.id}/chat`) && response.request().method() === "POST", { timeout: 190000 });
  await page.getByRole("button", { name: "Send message" }).click();
  const answerResponse = await reply; expect(answerResponse.ok()).toBe(true); const answer = (await answerResponse.json()).assistant_message;
  await expect(page.getByText(answer.content, { exact: true }).last()).toBeVisible();
  await page.reload(); await expect(page.getByText(answer.content, { exact: true }).last()).toBeVisible();
  if (answer.citations.length) {
    const citation = answer.citations[0];
    await page.getByRole("button", { name: `${citation.id} / ${citation.anchor.source.id}`, exact: true }).last().click();
    await expect(page.getByText(`Cited field: ${citation.anchor.field.replaceAll("_", " ")}`, { exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath("real-evidence.png"), fullPage: true });
    await page.getByRole("button", { name: "Close evidence" }).click();
  }
  await page.getByLabel("Conversation mode").selectOption("investigate"); await page.getByLabel("Investigation focus").selectOption("timeline");
  await composer.fill("Investigate the symptom timeline.");
  const scheduled = page.waitForResponse(response => response.url().includes(`/investigations/${run.id}/chat`) && response.request().method() === "POST", { timeout: 190000 });
  await page.getByRole("button", { name: "Send message" }).click();
  const scheduledResponse = await scheduled; expect(scheduledResponse.ok()).toBe(true); const linked = (await scheduledResponse.json()).assistant_message.new_investigation_id; expect(linked).toBeTruthy();
  await expect(page.locator(`a[href="/investigations/${linked}"]`)).toBeVisible();
  await page.screenshot({ path: info.outputPath("real-conversation.png"), fullPage: true });
});
