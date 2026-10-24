import { test, expect } from "@playwright/test";

test("investigation directory, new run, tool audit and dedicated evidence survive navigation", async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await page.goto("/investigations/new");
  await page.getByLabel("Find an imported patient").fill("Daniel");
  await page.getByRole("button", { name: "Select SYN-001", exact: true }).click();
  await page.getByRole("button", { name: "Start investigation", exact: true }).click();
  await page.getByRole("button", { name: "Begin investigation", exact: true }).click();
  await expect(page).toHaveURL(/\/investigations\/INV-/);
  const workbench = new URL(page.url()).pathname;
  await expect(page.getByRole("link", { name: /Open investigation report/ })).toBeVisible({ timeout: 90000 });
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`workbench-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("details.compact-activity > summary").click();
  await expect(page.getByRole("heading", { name: "Tool execution inspector" })).toBeVisible();
  const tool = page.locator("details.audit-card").filter({ hasText: "attempt" }).first();
  await tool.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(tool.getByText(/Full result payload unavailable/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("tool-inspector.png"), fullPage: true });
  await expect(page.getByRole("heading", { name: "Investigative leads" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("tasks-leads.png"), fullPage: true });
  await page.locator("#investigation-findings > summary").click();
  await page.getByRole("link", { name: "Inspect finding evidence", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Evidence explorer", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Compare source records/ }).first().click();
  await expect(page.getByRole("heading", { name: "Side-by-side evidence comparison" })).toBeVisible();
  await expect(page.getByText("Cited field:").first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("evidence-comparison.png"), fullPage: true });
  const source = page.getByRole("button", { name: / · supports$/ }).first();
  await source.click();
  await page.reload();
  await expect(page.getByText("Cited field:").first()).toBeVisible();
  await page.getByRole("link", { name: "Return to workbench" }).click();
  await expect(page).toHaveURL(new RegExp(`${workbench}$`));
  await page.getByRole("link", { name: "All investigations", exact: true }).click();
  await page.getByLabel("Patient identifier", { exact: true }).fill("SYN-001");
  await expect(page.getByRole("link", { name: "Open workbench" }).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("investigation-directory.png"), fullPage: true });
});
