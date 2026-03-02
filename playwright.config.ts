import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,
  timeout: 60000,
  reporter: process.env.CI
    ? [["github"], ["json", { outputFile: "e2e/reports/playwright-report.json" }]]
    : [["html"], ["json", { outputFile: "e2e/reports/playwright-report.json" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    navigationTimeout: 45000,
    actionTimeout: 15000,
  },
  projects: [
    {
      name: "client",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3000",
      },
      testMatch: "e2e/client/**/*.spec.ts",
    },
    {
      name: "admin",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3001",
      },
      testMatch: "e2e/admin/**/*.spec.ts",
    },
    {
      name: "marketing",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3002",
      },
      testMatch: "e2e/marketing/**/*.spec.ts",
    },
    {
      name: "mobile-client",
      use: {
        ...devices["iPhone 13"],
        baseURL: "http://localhost:3000",
      },
      testMatch: "e2e/mobile/**/*.spec.ts",
    },
    {
      name: "cross-app",
      use: {
        ...devices["Desktop Chrome"],
      },
      testMatch: "e2e/cross-app/**/*.spec.ts",
    },
  ],
  webServer: [
    {
      command: "pnpm dev:client",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: "pnpm dev:admin",
      url: "http://localhost:3001",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: "pnpm dev:marketing",
      url: "http://localhost:3002",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
