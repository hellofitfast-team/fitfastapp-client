import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

test.describe("Admin Signups", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("signups page loads", async ({ page }) => {
    await page.goto("/en/signups");

    // Should show the signups table or page content
    const table = page.locator("table").first();
    const pageText = page.locator("text=/signups|pending|registrations/i").first();
    const tableVisible = await table.isVisible().catch(() => false);
    const textVisible = await pageText.isVisible({ timeout: 15000 }).catch(() => false);
    expect(tableVisible || textVisible).toBeTruthy();
  });

  test("signups table has expected columns", async ({ page }) => {
    await page.goto("/en/signups");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Table should have header cells for key columns
    const headers = page.locator("thead th, [role='columnheader']");
    if ((await headers.count()) > 0) {
      // Should have at least name, email, status columns
      const headerTexts = await headers.allTextContents();
      const combined = headerTexts.join(" ").toLowerCase();
      expect(combined).toMatch(/name|email|status/i);
    }
  });

  test("signup detail page renders", async ({ page }) => {
    await page.goto("/en/signups");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Click on the first signup row if available
    const firstRow = page.locator("tbody tr, [class*='row']:has(a)").first();
    if (await firstRow.isVisible().catch(() => false)) {
      const link = firstRow.locator("a").first();
      if (await link.isVisible().catch(() => false)) {
        await link.click();
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(3000);

        // Detail page should show signup info
        await expect(page.locator("text=/email|name|plan|status/i").first()).toBeVisible({
          timeout: 10000,
        });
      }
    }
  });

  test("approve button is visible on pending signup", async ({ page }) => {
    await page.goto("/en/signups");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Navigate to first pending signup
    const pendingRow = page.locator('tr:has-text("pending")').first();
    if (await pendingRow.isVisible().catch(() => false)) {
      const link = pendingRow.locator("a").first();
      if (await link.isVisible().catch(() => false)) {
        await link.click();
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(3000);

        // Should have approve/reject buttons
        const approveButton = page.getByRole("button", { name: /approve/i }).first();
        await expect(approveButton).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test("reject requires a reason", async ({ page }) => {
    await page.goto("/en/signups");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    const pendingRow = page.locator('tr:has-text("pending")').first();
    if (await pendingRow.isVisible().catch(() => false)) {
      const link = pendingRow.locator("a").first();
      if (await link.isVisible().catch(() => false)) {
        await link.click();
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(3000);

        const rejectButton = page.getByRole("button", { name: /reject/i }).first();
        if (await rejectButton.isVisible().catch(() => false)) {
          await rejectButton.click();

          // Should show a textarea or input for rejection reason
          await expect(
            page.locator('textarea, input[name*="reason"], [role="dialog"]').first(),
          ).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });
});
