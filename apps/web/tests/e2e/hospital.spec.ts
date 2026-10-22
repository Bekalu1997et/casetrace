import { test, expect } from "@playwright/test";

test("control files flow through ingestion, hospital API and patient chart", async ({ page }, testInfo) => {
  test.skip(process.env.HOSPITAL_CONTROL_SMOKE !== "1", "Run scripts/hospital-smoke.sh to provision isolated control data.");
  await page.goto("/patients");
  await page.getByRole("link", { name: "Synthetic Pipeline Control" }).click();
  await expect(page.getByRole("heading", { name: "Synthetic Pipeline Control" })).toBeVisible();
  await page.getByRole("link", {name:"Encounters",exact:true}).click();
  await expect(page.getByRole("link",{name:"ENC-CONTROL",exact:true})).toBeVisible();
  await page.getByRole("link", { name: "Laboratory", exact: true }).click();
  await expect(page.getByText("Synthetic control measurement", { exact: true })).toBeVisible();
  await expect(page.getByText("2026-01-01T09:10:00+03:00", { exact: true })).toBeVisible();
  await expect(page.getByText("2026-01-02T11:00:00+03:00", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Medications", exact: true }).click();
  await expect(page.getByText("Synthetic control medication", { exact: true })).toBeVisible();
  await expect(page.getByText("2026-01-02", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Documents", exact: true }).click();
  await page.getByRole("link",{name:"DOC-CONTROL",exact:true}).click();
  await expect(page.getByText(/Pipeline control record only/)).toBeVisible();
  await page.getByRole("button", { name: "Open original asset" }).click();
  await expect(page.getByRole("link", { name: "Download original asset" })).toBeVisible();
  expect(await page.locator("body").innerText()).not.toContain("EVALUATION_SENTINEL_NEVER_SERVE");
  await page.getByRole("link", { name: "Timeline", exact: true }).click();
  await expect(page.getByText("specimen_collected_at", { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("hospital-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("hospital-mobile.png"), fullPage: true });
});
