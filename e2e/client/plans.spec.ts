import { test, expect } from "@playwright/test";
import { loginAsClient } from "../fixtures/auth";

test.describe("Client Plans", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
  });

  test("meal plan page loads or shows empty state", async ({ page }) => {
    await page.goto("/en/meal-plan");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Should see either meal plan content or empty state
    const content = page.locator("text=/meal plan|no meal plan|generating|وجبات/i").first();
    await expect(content).toBeVisible({ timeout: 15000 });
  });

  test("meal plan shows daily meals when plan exists", async ({ page }) => {
    await page.goto("/en/meal-plan");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const hasPlan = page.locator("text=/kcal|calories|protein|بروتين/i").first();
    const emptyState = page.locator("text=/no meal plan|generating your/i").first();

    const planExists = await hasPlan.isVisible({ timeout: 10000 }).catch(() => false);
    const isEmpty = await emptyState.isVisible().catch(() => false);

    if (planExists) {
      // Meal plan should show nutrition info
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toMatch(/kcal|calories|protein/i);

      // Should have day selector tabs
      const daySelector = page.locator("[data-active], button");
      const dayCount = await daySelector.count();
      expect(dayCount).toBeGreaterThan(0);
    } else {
      expect(isEmpty).toBeTruthy();
    }
  });

  test("workout plan page loads or shows empty state", async ({ page }) => {
    await page.goto("/en/workout-plan");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const content = page.locator("text=/workout plan|no workout plan|generating|تمرين/i").first();
    await expect(content).toBeVisible({ timeout: 15000 });
  });

  test("workout plan shows exercises when plan exists", async ({ page }) => {
    await page.goto("/en/workout-plan");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const hasPlan = page.locator("text=/exercise|sets|reps|rest day|warm-up|تمرين/i").first();
    const emptyState = page.locator("text=/no workout plan|generating your/i").first();

    const planExists = await hasPlan.isVisible({ timeout: 10000 }).catch(() => false);
    const isEmpty = await emptyState.isVisible().catch(() => false);

    if (planExists) {
      const bodyText = await page.locator("body").textContent();
      // Should show exercise details or rest day
      expect(bodyText).toMatch(/exercise|sets|reps|rest day|warm-up|cool-down/i);
    } else {
      expect(isEmpty).toBeTruthy();
    }
  });
});
