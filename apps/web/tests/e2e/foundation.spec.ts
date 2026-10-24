import { test, expect } from "@playwright/test";

test("browser reaches the real backend and retry works", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Hospital Overview" })).toBeVisible();
  await expect(page.getByText("API connected", { exact: true })).toBeVisible();
  await expect(page.getByText(/Database connected/)).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  for (const width of [1440, 1024, 768]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: testInfo.outputPath("foundation-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "Check connection" }).click();
  await expect(page.getByText("API connected", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeHidden();
  const toggle = page.getByRole("button", { name: "Expand sidebar" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Collapse sidebar" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Patient records" }).click();
  await expect(page).toHaveURL(/\/patients$/);
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeHidden();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Hospital Overview" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("foundation-mobile.png"), fullPage: true });
});
