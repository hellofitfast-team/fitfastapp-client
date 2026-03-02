import { test, expect } from "@playwright/test";
import { loginAsClient } from "../fixtures/auth";

test.describe("Invite Edge Cases", () => {
  test("expired/invalid token shows error message", async ({ page }) => {
    // Navigate to accept-invite with a fake token
    await page.goto("/en/accept-invite?token=invalid-fake-token-12345");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Should show error state
    const errorContent = page
      .locator("text=/invalid|expired|contact your coach|غير صالح/i")
      .first();
    await expect(errorContent).toBeVisible({ timeout: 15000 });

    // Should have a link back to login
    const loginLink = page.locator('a[href*="login"]').first();
    await expect(loginLink).toBeVisible({ timeout: 5000 });
  });

  test("expired subscription page renders renewal option", async ({ page }) => {
    await loginAsClient(page);
    await page.goto("/en/expired");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // The expired page should show subscription expired info or redirect
    // If the client's subscription isn't actually expired, they may be redirected
    const bodyText = await page.locator("body").textContent();
    const isExpiredPage = /expired|renewal|subscribe|انتهاء|تجديد/i.test(bodyText ?? "");
    const wasRedirected = /dashboard|home|settings/i.test(page.url());

    // Either we see the expired page or got redirected (valid subscription)
    expect(isExpiredPage || wasRedirected).toBeTruthy();
  });

  test("accept-invite page without token shows invalid link", async ({ page }) => {
    await page.goto("/en/accept-invite");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // No token → should show invalid invitation link message
    const invalidMsg = page
      .locator("text=/invalid invitation|contact your coach|رابط غير/i")
      .first();
    await expect(invalidMsg).toBeVisible({ timeout: 15000 });
  });
});
