import { defineConfig, devices } from "@playwright/test";

const legacyBaseUrl = process.env.LEGACY_BASE_URL;

export default defineConfig({
  testDir: "./tests/characterization",
  outputDir: "test-results/characterization",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: legacyBaseUrl ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  webServer: legacyBaseUrl
    ? undefined
    : {
        command: "bun run dev:legacy",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
