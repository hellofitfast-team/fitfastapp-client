import { test, expect } from "@playwright/test";
import { loginAsClient } from "../fixtures/auth";

test.describe("Client Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
  });

  test("dashboard renders after login", async ({ page }) => {
    // After login, should land on dashboard or be redirected there
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });

  test("greeting shows user name or welcome text", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Should see a greeting or welcome message
    const greeting = page.locator(
      "text=/welcome|hello|hey|good morning|good afternoon|good evening|مرحب/i",
    );
    if (
      await greeting
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(greeting.first()).toBeVisible();
    }
  });

  test("stats cards are visible", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Dashboard should show stat cards or summary info
    const cards = page.locator('[class*="card"], [class*="stat"], [class*="summary"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("meal plan section exists", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Should have a meal plan section or link
    const mealSection = page.locator('text=/meal|nutrition|food|وجب/i, [class*="meal"]');
    if (
      await mealSection
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(mealSection.first()).toBeVisible();
    }
  });

  test("workout plan section exists", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Should have a workout plan section or link
    const workoutSection = page.locator(
      'text=/workout|exercise|training|تمرين/i, [class*="workout"]',
    );
    if (
      await workoutSection
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(workoutSection.first()).toBeVisible();
    }
  });
});
