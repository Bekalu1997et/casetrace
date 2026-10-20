import { defineConfig } from "@playwright/test";

export default defineConfig({ testDir: "./tests/e2e", use: {
  baseURL: process.env.WEB_TEST_URL ?? "http://localhost:3000",
  viewport: { width: 1280, height: 800 },
  launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
}, projects: [{ name: "chromium", use: { browserName: "chromium" } }] });
