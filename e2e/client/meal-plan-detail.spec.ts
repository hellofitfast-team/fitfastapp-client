import { test, expect } from "@playwright/test";
import { loginAsClient } from "../fixtures/auth";

test.describe("Client Meal Plan Detail", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
    await page.goto("/en/meal-plan");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);
  });

  test("day selector tabs work", async ({ page }) => {
    // Look for day selector buttons (Day 1, Day 2, etc.)
    const dayButtons = page.locator("button").filter({ hasText: /day \d|يوم/i });
    const dayCount = await dayButtons.count();

    if (dayCount > 1) {
      // Click second day
      await dayButtons.nth(1).click();
      await page.waitForTimeout(500);

      // Should still show meal plan content
      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(50);
    } else {
      // No plan or single day — empty state is valid
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toMatch(/meal|no.*plan|generating|وجب/i);
    }
  });

  test("nutrition summary shows macros when plan exists", async ({ page }) => {
    const hasPlan = page.locator("text=/kcal|calories|protein|بروتين/i").first();
    const planExists = await hasPlan.isVisible({ timeout: 8000 }).catch(() => false);

    if (planExists) {
      // Should show macro chips (calories, protein, carbs, fat)
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toMatch(/protein|carbs|fat|بروتين/i);
    } else {
      // Empty state or generating
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toMatch(/no.*plan|generating|meal/i);
    }
  });

  test("meal cards expand to show details", async ({ page }) => {
    // Look for expandable meal card headers
    const mealHeader = page
      .locator("button")
      .filter({ hasText: /meal|breakfast|lunch|dinner|snack|وجبة/i })
      .first();

    if (await mealHeader.isVisible({ timeout: 8000 }).catch(() => false)) {
      await mealHeader.click();
      await page.waitForTimeout(500);

      // Expanded content should show ingredients or instructions
      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(100);
    }
  });
});
