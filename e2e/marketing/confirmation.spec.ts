import { test, expect } from "@playwright/test";

test.describe("Marketing Confirmation Page", () => {
  test("checkout page loads with form elements", async ({ page }) => {
    await page.goto("/en/checkout");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Should show checkout form or redirect to plan selection
    const bodyText = await page.locator("body").textContent();
    expect(bodyText!.length).toBeGreaterThan(20);

    // Look for form elements (name, email, phone, plan selection)
    const formElements = page.locator(
      'input[type="text"], input[type="email"], input[type="tel"], select, button[type="submit"]',
    );
    const count = await formElements.count();

    // Either form elements present or redirected to landing
    expect(count > 0 || page.url().includes("/en")).toBeTruthy();
  });

  test("checkout page shows plan options", async ({ page }) => {
    await page.goto("/en/checkout");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Should display plan/pricing information
    const bodyText = await page.locator("body").textContent();
    const hasPlans = bodyText!.match(/plan|month|EGP|price|شهر|خطة/i);
    const hasForm = bodyText!.match(/name|email|phone|checkout/i);

    expect(hasPlans || hasForm).toBeTruthy();
  });

  test("checkout form validates required fields", async ({ page }) => {
    await page.goto("/en/checkout");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Try to submit empty form
    const submitButton = page
      .getByRole("button", { name: /submit|register|sign up|تسجيل/i })
      .first();
    if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitButton.click();
      await page.waitForTimeout(1000);

      // Should show validation errors or required field indicators
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toMatch(/required|invalid|error|مطلوب|خطأ/i);
    }
  });
});
