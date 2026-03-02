import { test, expect } from "@playwright/test";

test.describe("Marketing Pricing", () => {
  test("plans display on landing page", async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // The landing page should show pricing plans loaded from Convex
    // Look for pricing section or plan cards
    const pricingSection = page
      .locator('[id*="pricing"], [class*="pricing"], section:has-text("month")')
      .first();
    await expect(pricingSection).toBeVisible({ timeout: 15000 });
  });

  test("plan prices are displayed with currency", async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Plans should show prices (EGP or $ amount)
    const priceText = page.locator("text=/\\d+.*(?:EGP|egp|LE|month)/i").first();
    await expect(priceText).toBeVisible({ timeout: 15000 });
  });

  test("plan selection opens checkout", async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Click a plan's CTA button (Get Started, Subscribe, etc.)
    const planButton = page
      .getByRole("button", { name: /get started|subscribe|choose|select/i })
      .first();

    if (await planButton.isVisible()) {
      await planButton.click();

      // Should open the checkout drawer/modal
      await expect(page.locator('[role="dialog"], [class*="drawer"], form').first()).toBeVisible({
        timeout: 5000,
      });
    }
  });
});
