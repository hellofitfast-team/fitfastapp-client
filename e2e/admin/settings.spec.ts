import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

test.describe("Admin Settings", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("settings page loads", async ({ page }) => {
    await page.goto("/en/settings");

    // Settings page should render
    await expect(page.locator("text=/settings|configuration|preferences/i").first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("payment methods section is visible", async ({ page }) => {
    await page.goto("/en/settings");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Should have payment methods section
    const paymentSection = page.locator("text=/payment|instapay|vodafone/i").first();
    await expect(paymentSection).toBeVisible({ timeout: 10000 });
  });

  test("plans configuration is visible", async ({ page }) => {
    await page.goto("/en/settings");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Should show plan/pricing configuration
    const plansSection = page.locator("text=/plan|pricing|subscription/i").first();
    await expect(plansSection).toBeVisible({ timeout: 10000 });
  });
});
