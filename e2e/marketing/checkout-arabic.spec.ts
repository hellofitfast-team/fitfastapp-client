import { test, expect } from "@playwright/test";

test.describe("Marketing Checkout — Arabic", () => {
  async function openCheckoutArabic(page: import("@playwright/test").Page) {
    await page.goto("/ar");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Click a plan's CTA button to open checkout in Arabic
    const planButton = page
      .getByRole("button")
      .filter({
        hasText: /ابدأ|اشترك|اختر/,
      })
      .first();

    if (await planButton.isVisible()) {
      await planButton.click();
      await page.waitForTimeout(500);
    }
  }

  test("checkout form labels are in Arabic", async ({ page }) => {
    await openCheckoutArabic(page);

    // Check that form labels contain Arabic text
    const labels = page.locator("label");
    const count = await labels.count();

    if (count > 0) {
      for (let i = 0; i < Math.min(count, 3); i++) {
        const text = await labels.nth(i).textContent();
        if (text && text.trim()) {
          // Should contain Arabic characters
          expect(text).toMatch(/[\u0600-\u06FF]/);
        }
      }
    }
  });

  test("validation error messages appear in Arabic", async ({ page }) => {
    await openCheckoutArabic(page);

    // Try to submit empty form
    const submitButton = page.getByRole("button").last();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(1000);

      // Any error messages should be in Arabic
      const errorElements = page.locator(
        '[class*="error"], [class*="destructive"], [role="alert"]',
      );
      const errorCount = await errorElements.count();

      for (let i = 0; i < errorCount; i++) {
        const text = await errorElements.nth(i).textContent();
        if (text && text.trim().length > 2) {
          expect(text).toMatch(/[\u0600-\u06FF]/);
        }
      }
    }
  });
});
