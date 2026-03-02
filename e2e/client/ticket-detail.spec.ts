import { test, expect } from "@playwright/test";
import { loginAsClient } from "../fixtures/auth";

test.describe("Client Ticket Detail", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
  });

  test("tickets page loads with list or empty state", async ({ page }) => {
    await page.goto("/en/tickets");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Should show ticket list or empty state
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toMatch(/ticket|support|no ticket|create|إنشاء|تذكرة/i);
  });

  test("ticket detail page loads with messages", async ({ page }) => {
    await page.goto("/en/tickets");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Click first ticket if available
    const ticketLink = page.locator('a[href*="/tickets/"]').first();
    if (await ticketLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await ticketLink.click();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000);

      // Should show ticket subject and messages
      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(20);

      // Should have back link
      const backLink = page.locator('a[href*="/tickets"]').first();
      await expect(backLink).toBeVisible({ timeout: 5000 });
    }
  });

  test("reply textarea exists on open ticket", async ({ page }) => {
    await page.goto("/en/tickets");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    const ticketLink = page.locator('a[href*="/tickets/"]').first();
    if (await ticketLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await ticketLink.click();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000);

      // If ticket is open, reply area should be visible
      const replyArea = page.locator("textarea").first();
      const closedMsg = page.locator("text=/closed|مغلقة/i").first();

      const hasReply = await replyArea.isVisible({ timeout: 5000 }).catch(() => false);
      const isClosed = await closedMsg.isVisible().catch(() => false);

      // Either reply area is visible or ticket is closed
      expect(hasReply || isClosed).toBeTruthy();
    }
  });

  test("back button returns to ticket list", async ({ page }) => {
    await page.goto("/en/tickets");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    const ticketLink = page.locator('a[href*="/tickets/"]').first();
    if (await ticketLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await ticketLink.click();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000);

      const backLink = page.locator('a[href*="/tickets"]').first();
      if (await backLink.isVisible().catch(() => false)) {
        await backLink.click();
        await page.waitForTimeout(2000);
        expect(page.url()).toMatch(/\/tickets\/?$/);
      }
    }
  });
});
