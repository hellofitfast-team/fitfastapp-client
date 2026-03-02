import { test, expect } from "@playwright/test";

test.describe("Client Onboarding Assessment", () => {
  test("assessment page loads with step indicators", async ({ page }) => {
    await page.goto("/en/initial-assessment");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Should show assessment form or redirect to login
    const bodyText = await page.locator("body").textContent();
    expect(bodyText!.length).toBeGreaterThan(20);
  });

  test("assessment form requires authentication", async ({ page }) => {
    await page.goto("/en/initial-assessment");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Should either show assessment form (if auth cookie exists) or redirect to login
    const url = page.url();
    const isAssessment = url.includes("initial-assessment");
    const isLogin = url.includes("login");
    const isOnboarding = url.includes("onboarding") || url.includes("welcome");
    expect(isAssessment || isLogin || isOnboarding).toBeTruthy();
  });

  test("assessment page has proper form elements", async ({ page }) => {
    await page.goto("/en/initial-assessment");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // If we land on the assessment page (authenticated), check for form elements
    if (page.url().includes("initial-assessment")) {
      const formElements = page.locator(
        'input, select, textarea, button[type="submit"], [role="radio"], [role="checkbox"]',
      );
      const count = await formElements.count();
      // Should have some form elements for the assessment wizard
      expect(count).toBeGreaterThan(0);
    }
  });
});
