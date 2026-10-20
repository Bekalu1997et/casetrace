import { test, expect } from "@playwright/test";

test("browser reaches the real backend and retry works", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Clinical investigation workspace" })).toBeVisible();
  await expect(page.getByText("API connected", { exact: true })).toBeVisible();
  await expect(page.getByText(/Database connected/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("foundation-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "Check connection" }).click();
  await expect(page.getByText("API connected", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Clinical investigation workspace" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("foundation-mobile.png"), fullPage: true });
});
