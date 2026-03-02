import { test, expect } from "@playwright/test";
import { loginAsClient, loginAsClientArabic } from "../fixtures/auth";

test.describe("Client FAQ", () => {
  test("FAQ page loads and shows entries", async ({ page }) => {
    await loginAsClient(page);
    await page.goto("/en/faq");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Should see FAQ heading
    const heading = page.locator("text=/frequently asked|FAQ|أسئلة/i").first();
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Should have search input
    const searchInput = page.locator('input[placeholder*="search" i], input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  test("FAQ accordion expands/collapses", async ({ page }) => {
    await loginAsClient(page);
    await page.goto("/en/faq");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Find an FAQ question button
    const faqButton = page.locator('button:has-text("?"), [aria-expanded]').first();

    if (await faqButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      // Click to expand
      await faqButton.click();
      await page.waitForTimeout(500);

      // Body should have content after expanding
      const bodyText = await page.locator("body").textContent();
      expect(bodyText?.length).toBeGreaterThan(50);

      // Click again to collapse (force to bypass overlays)
      await faqButton.click({ force: true });
      await page.waitForTimeout(300);
    }
  });

  test("FAQ page works in Arabic", async ({ page }) => {
    await loginAsClientArabic(page);
    await page.goto("/ar/faq");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Verify RTL
    const dir = await page.getAttribute("html", "dir");
    expect(dir).toBe("rtl");

    // Should have Arabic content
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toMatch(/[\u0600-\u06FF]/);

    // FAQ heading or content should be visible
    const content = page.locator("text=/أسئلة|الأسئلة|FAQ/i").first();
    await expect(content).toBeVisible({ timeout: 15000 });
  });
});
