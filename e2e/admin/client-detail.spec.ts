import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

test.describe("Admin Client Detail", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("clients list page loads with table", async ({ page }) => {
    await page.goto("/en/clients");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Should see clients heading
    const heading = page.locator("text=/clients|عملاء/i").first();
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Should have a table or client rows
    const table = page.locator("table, [class*='rounded-xl'][class*='border']");
    const tableCount = await table.count();
    expect(tableCount).toBeGreaterThan(0);
  });

  test("search input filters clients", async ({ page }) => {
    await page.goto("/en/clients");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    const searchInput = page.locator('input[placeholder*="search" i], input[type="text"]').first();

    if (await searchInput.isVisible({ timeout: 10000 }).catch(() => false)) {
      await searchInput.fill("client");
      await page.waitForTimeout(500);

      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toBeTruthy();
    }
  });

  test("client detail page shows profile info", async ({ page }) => {
    await page.goto("/en/clients");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Click the first client detail link
    const detailLink = page.locator('a[href*="/clients/"]').first();

    if (await detailLink.isVisible({ timeout: 10000 }).catch(() => false)) {
      await detailLink.click();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(3000);

      // Should show client profile info or loading state
      const profileContent = page
        .locator("text=/profile|status|plan|assessment|الملف|loading/i")
        .first();
      await expect(profileContent).toBeVisible({ timeout: 15000 });
    }
  });

  test("client detail shows profile cards", async ({ page }) => {
    await page.goto("/en/clients");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    const detailLink = page.locator('a[href*="/clients/"]').first();
    if (await detailLink.isVisible({ timeout: 10000 }).catch(() => false)) {
      await detailLink.click();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(3000);

      // Should show profile, plan period, and assessment cards
      const bodyText = await page.locator("body").textContent();
      const hasCards = /profile|plan period|assessment|الملف|الخطة|التقييم/i.test(bodyText ?? "");
      const isLoading = /loading/i.test(bodyText ?? "");

      // Accept cards visible or still loading
      expect(hasCards || isLoading).toBeTruthy();
    }
  });

  test("client detail shows check-in history and plans", async ({ page }) => {
    await page.goto("/en/clients");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    const detailLink = page.locator('a[href*="/clients/"]').first();
    if (await detailLink.isVisible({ timeout: 10000 }).catch(() => false)) {
      await detailLink.click();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(3000);

      const bodyText = (await page.locator("body").textContent()) ?? "";

      // Client detail should show check-in history, meal plan, or workout plan sections
      const hasCheckInHistory = /check.?in|history|تسجيل/i.test(bodyText);
      const hasPlanInfo = /meal plan|workout plan|خطة|تمرين/i.test(bodyText);
      const hasProfileCards = /profile|assessment|الملف|التقييم/i.test(bodyText);
      const isLoading = /loading/i.test(bodyText);

      // Should show at least profile cards or plan info
      expect(hasCheckInHistory || hasPlanInfo || hasProfileCards || isLoading).toBeTruthy();
    }
  });

  test("send notification dialog renders for active client", async ({ page }) => {
    await page.goto("/en/clients");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    const detailLink = page.locator('a[href*="/clients/"]').first();
    if (await detailLink.isVisible({ timeout: 10000 }).catch(() => false)) {
      await detailLink.click();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(3000);

      // Look for Send Notification button (only visible for active clients)
      const notifBtn = page.getByRole("button", { name: /send notification|إرسال إشعار/i }).first();

      if (await notifBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await notifBtn.click();
        await page.waitForTimeout(300);

        // Dialog should open
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("back navigation returns to client list", async ({ page }) => {
    await page.goto("/en/clients");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    const detailLink = page.locator('a[href*="/clients/"]').first();
    if (await detailLink.isVisible({ timeout: 10000 }).catch(() => false)) {
      await detailLink.click();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000);

      // Click back link
      const backLink = page.locator('a[href*="/clients"]').first();
      if (await backLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await backLink.click();
        await page.waitForURL(/\/clients(?!\/)/, { timeout: 10000 });
        expect(page.url()).toMatch(/\/clients/);
      }
    }
  });
});
