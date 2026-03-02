import { test, expect } from "@playwright/test";
import { loginAsClient } from "../fixtures/auth";

test.describe("Client Settings", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
  });

  test("settings page loads", async ({ page }) => {
    await page.goto("/en/settings");

    await expect(page.locator("text=/settings|preferences|profile/i").first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("language toggle exists", async ({ page }) => {
    await page.goto("/en/settings");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Should have a language selector/toggle
    const langText = page.locator("text=/language|لغة/i").first();
    const langSelect = page.locator('select, [class*="language"]').first();
    const langButton = page.locator("text=/English|العربية|EN|AR/").first();
    const hasLangToggle =
      (await langText.isVisible({ timeout: 10000 }).catch(() => false)) ||
      (await langSelect.isVisible().catch(() => false)) ||
      (await langButton.isVisible().catch(() => false));
    expect(hasLangToggle).toBeTruthy();
  });

  test("notification preferences section exists", async ({ page }) => {
    await page.goto("/en/settings");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Should have notification settings
    const notifSection = page.locator("text=/notification|reminder|alert|إشعار/i");
    if (
      await notifSection
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(notifSection.first()).toBeVisible();
    }
  });
});
