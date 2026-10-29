import { defineConfig, devices } from "@playwright/test";

const localOrigin = "http://127.0.0.1:3000";
// Local runs use the dev server started below. Set PLAYWRIGHT_BASE_URL to a
// deployment origin (https://$VERCEL_URL) when the suite should hit that host.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? localOrigin;
const testingLocalServer = baseURL === localOrigin || baseURL.startsWith("http://localhost:");

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: testingLocalServer
    ? {
        command: "npm run dev -- --port 3000",
        url: localOrigin,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
  projects: [
    {
      name: "phone",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
});
