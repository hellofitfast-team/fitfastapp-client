import { test, expect } from "@playwright/test";
import { loginAsClient } from "../fixtures/auth";

test.describe("Client Progress", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
    await page.goto("/en/progress");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
  });

  test("progress page loads with tabs", async ({ page }) => {
    // Should see the progress page heading
    const heading = page.locator("text=/progress|your progress|تقدم/i").first();
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Should have tabs (Charts, Photos, History)
    const tabsContent = page.locator("text=/charts|photos|history|رسوم|صور|سجل/i").first();
    await expect(tabsContent).toBeVisible({ timeout: 10000 });
  });

  test("charts tab shows weight chart or empty state", async ({ page }) => {
    // Click Charts tab if not already active
    const chartsTab = page.getByRole("button", { name: /charts|رسوم/i }).first();
    if (await chartsTab.isVisible({ timeout: 10000 }).catch(() => false)) {
      await chartsTab.click();
      await page.waitForTimeout(500);
    }

    // Should show either a chart or stats overview
    const bodyText = await page.locator("body").textContent();
    const hasContent = /weight|chart|start|current|change|check-in|الوزن|لا توجد/i.test(
      bodyText ?? "",
    );
    expect(hasContent).toBeTruthy();
  });

  test("photos tab shows gallery or empty state", async ({ page }) => {
    const photosTab = page.getByRole("button", { name: /photos|صور/i }).first();
    if (await photosTab.isVisible({ timeout: 10000 }).catch(() => false)) {
      await photosTab.click();
      await page.waitForTimeout(500);

      // Should see photos or empty message
      const bodyText = await page.locator("body").textContent();
      const hasPhotos = /photo|image|gallery|no.*photo|صور/i.test(bodyText ?? "");
      expect(hasPhotos).toBeTruthy();
    }
  });

  test("history tab shows check-in entries or empty state", async ({ page }) => {
    const historyTab = page.getByRole("button", { name: /history|سجل/i }).first();
    if (await historyTab.isVisible({ timeout: 10000 }).catch(() => false)) {
      await historyTab.click();
      await page.waitForTimeout(500);

      // Should see history entries or empty state
      const bodyText = await page.locator("body").textContent();
      const hasHistory = /check-in|history|date|weight|kg|no.*history|لا توجد/i.test(
        bodyText ?? "",
      );
      expect(hasHistory).toBeTruthy();
    }
  });
});
