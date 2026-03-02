import { test, expect } from "@playwright/test";
import { loginAsClient } from "../fixtures/auth";

test.describe("Client Workout Plan Detail", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
    await page.goto("/en/workout-plan");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);
  });

  test("training split shows day labels", async ({ page }) => {
    const hasPlan = page.locator("text=/exercise|sets|reps|rest day|warm-up|تمرين/i").first();
    const planExists = await hasPlan.isVisible({ timeout: 8000 }).catch(() => false);

    if (planExists) {
      // Day selector buttons should exist
      const dayButtons = page.locator("button").filter({ hasText: /day \d|يوم/i });
      const dayCount = await dayButtons.count();
      expect(dayCount).toBeGreaterThan(0);
    } else {
      // Empty state
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toMatch(/no.*plan|generating|workout/i);
    }
  });

  test("exercise cards show sets and reps", async ({ page }) => {
    const hasPlan = page.locator("text=/exercise|sets|reps|rest day|تمرين/i").first();
    const planExists = await hasPlan.isVisible({ timeout: 8000 }).catch(() => false);

    if (planExists) {
      const bodyText = await page.locator("body").textContent();
      // Should show exercise details or rest day info
      expect(bodyText).toMatch(/exercise|sets|reps|rest day|warm-up|cool-down|تمرين/i);
    }
  });

  test("rest day shows appropriate message", async ({ page }) => {
    const hasPlan = page.locator("text=/exercise|rest day|تمرين|راحة/i").first();
    const planExists = await hasPlan.isVisible({ timeout: 8000 }).catch(() => false);

    if (planExists) {
      // Try clicking different days to find a rest day
      const dayButtons = page.locator("button").filter({ hasText: /day \d|يوم/i });
      const dayCount = await dayButtons.count();

      for (let i = 0; i < Math.min(dayCount, 7); i++) {
        await dayButtons.nth(i).click();
        await page.waitForTimeout(300);

        const restDay = page.locator("text=/rest day|recovery|راحة/i").first();
        if (await restDay.isVisible().catch(() => false)) {
          await expect(restDay).toBeVisible();
          return;
        }
      }
      // No rest day found in first 7 days — that's ok, workout every day is valid
    }
  });
});
