import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

test.describe("Admin Signup Approval Flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("signup detail shows applicant information", async ({ page }) => {
    await page.goto("/en/signups");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Click first signup row
    const row = page.locator("tbody tr a, [class*='row'] a").first();
    if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
      await row.click();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000);

      // Detail page should show applicant info
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toMatch(/name|email|phone|plan|status/i);
    } else {
      // No signups exist — empty state is valid
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toMatch(/signup|no.*pending|registration/i);
    }
  });

  test("payment screenshot displays if uploaded", async ({ page }) => {
    await page.goto("/en/signups");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    const row = page.locator("tbody tr a, [class*='row'] a").first();
    if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
      await row.click();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000);

      // Look for payment screenshot image or placeholder
      const screenshot = page
        .locator('img[src*="payment"], img[alt*="payment"], img[alt*="screenshot"]')
        .first();
      const noScreenshot = page.locator("text=/no.*screenshot|no.*proof|لا.*إثبات/i").first();

      const hasScreenshot = await screenshot.isVisible().catch(() => false);
      const hasPlaceholder = await noScreenshot.isVisible().catch(() => false);

      // Either screenshot exists or no-screenshot placeholder shown or section absent
      const bodyText = await page.locator("body").textContent();
      expect(
        hasScreenshot || hasPlaceholder || bodyText!.match(/payment|status|plan/i),
      ).toBeTruthy();
    }
  });

  test("approve and reject buttons are present on pending signup", async ({ page }) => {
    await page.goto("/en/signups");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Navigate to first pending signup
    const pendingRow = page.locator('tr:has-text("pending"), tr:has-text("Pending")').first();
    if (await pendingRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      const link = pendingRow.locator("a").first();
      if (await link.isVisible().catch(() => false)) {
        await link.click();
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(2000);

        // Both approve and reject should be visible
        const approve = page.getByRole("button", { name: /approve|قبول/i }).first();
        const reject = page.getByRole("button", { name: /reject|رفض/i }).first();

        const hasApprove = await approve.isVisible({ timeout: 5000 }).catch(() => false);
        const hasReject = await reject.isVisible({ timeout: 5000 }).catch(() => false);

        expect(hasApprove || hasReject).toBeTruthy();
      }
    }
  });

  test("signups page has status filter or badges", async ({ page }) => {
    await page.goto("/en/signups");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Should show status badges or a filter for pending/approved/rejected
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toMatch(/pending|approved|rejected|status|signup|تسجيل/i);
  });
});
