import { test, expect } from "@playwright/test";

test.describe("Magic Link (Forgot Password)", () => {
  test("magic-link page loads with email form", async ({ page }) => {
    await page.goto("/en/magic-link");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Should show magic link / forgot password heading
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toMatch(/magic link|forgot|reset|send|email|إرسال/i);

    // Should have email input
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });

  test("back to login link exists", async ({ page }) => {
    await page.goto("/en/magic-link");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Should have a back link to login
    const backLink = page.locator('a[href*="login"]').first();
    await expect(backLink).toBeVisible({ timeout: 10000 });
  });
});
