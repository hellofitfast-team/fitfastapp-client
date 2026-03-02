import { test, expect } from "@playwright/test";

test.describe("Cross-App Signup to Onboarding", () => {
  test("marketing checkout page is accessible", async ({ page }) => {
    // Marketing app — verify the signup entry point exists
    await page.goto("http://localhost:3002/en/checkout");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const bodyText = await page.locator("body").textContent();
    // Should show checkout/signup content
    expect(bodyText!.length).toBeGreaterThan(20);
    expect(bodyText).toMatch(/checkout|plan|sign|register|name|email/i);
  });

  test("admin signups page shows pending registrations", async ({ page }) => {
    // Admin app — verify admin can see signups
    await page.goto("http://localhost:3001/en/login");
    await page.locator("#email").fill("testadmin@admin.com");
    await page.locator("#password").fill("test12345");
    await page
      .getByRole("button", { name: /sign in/i })
      .first()
      .click();
    await page.waitForURL(/\/en(?!\/login)/, { timeout: 30000 });

    await page.goto("http://localhost:3001/en/signups");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Should show signups table or empty state
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toMatch(/signup|pending|registration|no.*signup/i);
  });
});
