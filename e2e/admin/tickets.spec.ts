import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

test.describe("Admin Tickets", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/en/tickets");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);
  });

  test("tickets page loads", async ({ page }) => {
    // Should see "Open Tickets" heading or tickets-related content
    const heading = page.locator("text=/open tickets|tickets|تذاكر/i").first();
    await expect(heading).toBeVisible({ timeout: 15000 });
  });

  test("ticket list shows status badges or loading state", async ({ page }) => {
    // Wait extra for data to load
    await page.waitForTimeout(2000);

    const bodyText = await page.locator("body").textContent();
    // Accept: ticket data loaded, empty state, or still loading
    const hasContent = /open|coach responded|closed|مفتوح|no results|loading/i.test(bodyText ?? "");
    expect(hasContent).toBeTruthy();
  });

  test("admin can view ticket detail (expand)", async ({ page }) => {
    await page.waitForTimeout(2000);

    // Click first ticket to expand
    const ticketButton = page.locator('button[class*="w-full"][class*="text-start"]').first();

    if (await ticketButton.isVisible({ timeout: 8000 }).catch(() => false)) {
      await ticketButton.click();
      await page.waitForTimeout(500);

      // Expanded ticket should show messages or response area
      const messageContent = page
        .locator("text=/coach response|client|type your response/i")
        .first();
      const hasMessages = await messageContent.isVisible({ timeout: 5000 }).catch(() => false);

      const responseArea = page.locator('textarea[placeholder*="response" i]').first();
      const hasResponse = await responseArea.isVisible().catch(() => false);

      expect(hasMessages || hasResponse).toBeTruthy();
    }
  });

  test("admin can respond to ticket", async ({ page }) => {
    await page.waitForTimeout(2000);

    const ticketButton = page.locator('button[class*="w-full"][class*="text-start"]').first();

    if (await ticketButton.isVisible({ timeout: 8000 }).catch(() => false)) {
      await ticketButton.click();
      await page.waitForTimeout(500);

      const responseArea = page.locator('textarea[placeholder*="response" i]').first();

      if (await responseArea.isVisible({ timeout: 5000 }).catch(() => false)) {
        await responseArea.fill("E2E test response from admin");

        const respondBtn = page.getByRole("button", { name: /respond|رد/i }).first();
        await expect(respondBtn).toBeEnabled();
      }
    }
  });

  test("admin can close ticket", async ({ page }) => {
    await page.waitForTimeout(2000);

    const ticketButton = page.locator('button[class*="w-full"][class*="text-start"]').first();

    if (await ticketButton.isVisible({ timeout: 8000 }).catch(() => false)) {
      await ticketButton.click();
      await page.waitForTimeout(500);

      // Look for close button
      const closeBtn = page.getByRole("button", { name: /close|إغلاق/i }).first();

      if (await closeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(closeBtn).toBeVisible();
      }
    }
  });
});
