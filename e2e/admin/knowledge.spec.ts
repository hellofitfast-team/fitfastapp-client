import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

test.describe("Admin Knowledge Base", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/en/knowledge");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);
  });

  test("knowledge base page loads", async ({ page }) => {
    const heading = page.locator("text=/knowledge base|قاعدة المعرفة/i").first();
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Should have tabs (Knowledge, Food & Recipes)
    const tabs = page.locator("text=/knowledge|food|recipes|معرفة|طعام|وصفات/i");
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);
  });

  test("knowledge entries display or empty state", async ({ page }) => {
    const entries = page.locator(
      '[class*="rounded-xl"][class*="border"][class*="bg-white"]:has(h3)',
    );
    const emptyState = page.locator("text=/no knowledge entries|add your coaching/i").first();
    const addTextBtn = page.getByRole("button", { name: /add text|إضافة نص/i }).first();

    const hasEntries = (await entries.count()) > 0;
    const isEmpty = await emptyState.isVisible({ timeout: 8000 }).catch(() => false);
    const hasActions = await addTextBtn.isVisible().catch(() => false);

    expect(hasEntries || isEmpty || hasActions).toBeTruthy();
  });
});
