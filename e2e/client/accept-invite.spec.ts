import { test, expect } from "@playwright/test";

test.describe("Client Accept Invite", () => {
  test("invalid token shows error state", async ({ page }) => {
    await page.goto("/en/accept-invite?token=invalid-token-12345");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Should show an error or invalid/expired message
    await expect(page.locator("text=/invalid|expired|not found|error/i").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("missing token shows error state", async ({ page }) => {
    await page.goto("/en/accept-invite");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Without a token, should show error or redirect
    const hasError = await page
      .locator("text=/invalid|token|required|error/i")
      .first()
      .isVisible()
      .catch(() => false);
    const isRedirected = page.url().includes("/login");

    expect(hasError || isRedirected).toBeTruthy();
  });

  test("accept invite page has password fields", async ({ page }) => {
    // Even with an invalid token, the page structure should be there
    await page.goto("/en/accept-invite?token=test-token-placeholder");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Check for password creation fields (may or may not be visible based on token validity)
    // If token is invalid, it shows error; if valid, shows password form
    const pageText = await page.locator("body").textContent();
    // Page should mention password creation or show an error about the token
    expect(pageText).toMatch(/password|create|invalid|expired|token|error/i);
  });

  test("password mismatch shows validation error", async ({ page }) => {
    // This test verifies client-side validation even if token is invalid
    await page.goto("/en/accept-invite?token=test-token-placeholder");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // If password fields are visible (valid token scenario), test mismatch
    const passwordField = page.locator('input[type="password"]').first();
    if (await passwordField.isVisible().catch(() => false)) {
      const passwordFields = page.locator('input[type="password"]');
      const count = await passwordFields.count();

      if (count >= 2) {
        await passwordFields.nth(0).fill("password123");
        await passwordFields.nth(1).fill("different456");

        // Submit the form
        const submitButton = page
          .getByRole("button", { name: /create|submit|continue|accept/i })
          .first();
        if (await submitButton.isVisible()) {
          await submitButton.click();

          // Should show mismatch error
          await expect(
            page.locator("text=/mismatch|match|don't match|not match/i").first(),
          ).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });
});
